import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { decodeFunctionData, erc20Abi, maxUint256, type Address, type Hash, type Hex } from "viem";
import { routerAbi } from "../lib/slipstream";
import { GET } from "../app/api/geo/route";
import { assertGeo, readGeo, TRUSTED_GEO_SOURCE, type Geo } from "../lib/geo";
import { STALE_SECONDS } from "../lib/oracle";
import { assertMarket, assertQuote, minimumOutput, runSigningBoundary, tradeInput, tradingBoundary, type Quote, type SigningBoundary, type TradeContext } from "../lib/trade";
import { CHAIN_ID, TOKENS, USDC } from "../lib/tokens";
import { createWallet, walletContext, type InjectedProvider, type WalletState } from "../lib/wallet";

const account: Address = "0x1111111111111111111111111111111111111111";
const other: Address = "0x2222222222222222222222222222222222222222";
const hash = `0x${"ab".repeat(32)}` as Hash;
const now = 1_800_000_000_000;
const context: TradeContext = { account, chainId: CHAIN_ID, revision: 1, token: TOKENS[0].token, amount: "1", slippage: "0.50", side: "buy" };
const quote: Quote = { context, amountIn: 1_000_000n, amountOut: 10_000n, minOut: 9950n, scaled: 10_000n, decimals: 8, tokenDecimals: 8, router: other, tickSpacing: 10, block: 1n, createdAt: now, expiresAt: now + 60_000 };

// Test-only provider: cannot reach any network or submit a transaction.
class MockProvider extends EventEmitter implements InjectedProvider {
  accounts: string[] = [account];
  chain = "0x2105";
  calls: { method: string; params?: readonly unknown[] }[] = [];
  reject = "";
  pending: Promise<unknown> | null = null;
  async request(args: { method: string; params?: readonly unknown[] }): Promise<unknown> {
    this.calls.push(args);
    if (this.reject === args.method) throw Object.assign(new Error("Rejected"), { code: 4001 });
    if (args.method === "eth_requestAccounts") return this.pending ?? this.accounts;
    if (args.method === "eth_accounts") return this.accounts;
    if (args.method === "eth_chainId") return this.chain;
    if (args.method === "wallet_switchEthereumChain") { this.chain = "0x2105"; this.emit("chainChanged", this.chain); return null; }
    throw new Error(`Test provider prohibits ${args.method}`);
  }
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("wallet requests consent, tracks accounts/chain, disconnects locally and cleans listeners", async () => {
  const provider = new MockProvider();
  const states: WalletState[] = [];
  const wallet = createWallet(provider, state => states.push(state));
  assert.equal(provider.calls.length, 0);
  await wallet.connect();
  assert.equal(wallet.getState().account, account);
  provider.accounts = [other]; provider.emit("accountsChanged", [other]);
  assert.equal(wallet.getState().account, null, "old balances invalidated synchronously");
  await flush();
  assert.equal(wallet.getState().account, other);
  provider.chain = "0x1"; provider.emit("chainChanged", "0x1"); await flush();
  assert.equal(wallet.getState().chainId, 1);
  await wallet.switchBase();
  assert.equal(wallet.getState().chainId, CHAIN_ID);
  assert.deepEqual(provider.calls.find(call => call.method === "wallet_switchEthereumChain")?.params, [{ chainId: "0x2105" }]);
  provider.accounts = []; provider.emit("accountsChanged", []); await flush();
  assert.equal(wallet.getState().account, null);
  wallet.disconnect();
  provider.accounts = [account]; provider.emit("accountsChanged", [account]); await flush();
  assert.equal(wallet.getState().account, null, "local disconnect cannot silently reconnect");
  wallet.destroy();
  assert.equal(provider.listenerCount("accountsChanged") + provider.listenerCount("chainChanged") + provider.listenerCount("disconnect"), 0);
  assert.ok(states.length > 3);
});

test("wallet rejects malformed context, surfaces rejection and discards late connect results", async () => {
  const provider = new MockProvider();
  const wallet = createWallet(provider, () => {});
  provider.reject = "eth_requestAccounts";
  await wallet.connect();
  assert.match(wallet.getState().error, /rejected/i);
  assert.equal(wallet.getState().account, null);
  provider.reject = "";
  let resolve!: (value: unknown) => void;
  provider.pending = new Promise(done => { resolve = done; });
  const pending = wallet.connect();
  wallet.disconnect(); resolve([account]); await pending;
  assert.equal(wallet.getState().account, null);
  provider.pending = null; provider.accounts = ["not an address"];
  await assert.rejects(walletContext(provider), /Invalid wallet accounts/);
  provider.accounts = [account]; provider.chain = "NaN";
  await assert.rejects(walletContext(provider), /Invalid wallet chain/);
  provider.chain = "0x2105";
  await wallet.connect(); provider.emit("disconnect", new Error("offline"));
  assert.equal(wallet.getState().account, null);
  wallet.destroy();
});

test("geo fails closed locally; ignores arbitrary host, query, cookies and country headers", async () => {
  const local = readGeo();
  assert.equal(local.country, null); assert.equal(local.allowed, false);
  const request = new Request("https://fake.vercel.app/api/geo?country=TH", { headers: { "x-vercel-ip-country": "TH", "x-vercel-id": "fake", "x-forwarded-for": "1.1.1.1", cookie: "country=TH" } });
  const response = await GET(request);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  const body = await response.json();
  assert.equal(body.country, null); assert.equal(body.allowed, false);
  const trustedRequest = new Request("https://sharelens.example/api/geo");
  Object.defineProperty(trustedRequest, "cf", { value: { country: "TH" } });
  const trustedResponse = await GET(trustedRequest);
  const trustedBody = await trustedResponse.json();
  assert.deepEqual({ country: trustedBody.country, allowed: trustedBody.allowed, source: trustedBody.source }, { country: "TH", allowed: true, source: TRUSTED_GEO_SOURCE });
  const trusted: Geo = { country: "TH", allowed: true, source: TRUSTED_GEO_SOURCE, checkedAt: now, reason: "" };
  assert.doesNotThrow(() => assertGeo(trusted, now));
  for (const change of [{ country: "US" }, { country: null }, { allowed: false }, { source: "client-header" }, { checkedAt: now - 30_001 }, { checkedAt: now + 1 }, { checkedAt: NaN }]) {
    assert.throws(() => assertGeo({ ...trusted, ...change }, now));
  }
});

test("market gates reject US-independent stale/paused/invalid oracle, missing pool and exact red threshold", () => {
  const oracle = { answer: 100n, decimals: 0, updatedAt: now / 1000, paused: false };
  for (const numerator of [99000n, 100299n, 100300n, 101000n]) assert.doesNotThrow(() => assertMarket(oracle, { numerator, denominator: 1000n }, now));
  assert.throws(() => assertMarket(oracle, { numerator: 101001n, denominator: 1000n }, now), /exceeds/);
  const pool = { numerator: 100n, denominator: 1n };
  for (const change of [{ answer: 0n }, { updatedAt: 0 }, { updatedAt: NaN }, { updatedAt: Infinity }, { updatedAt: now / 1000 + 1 }, { updatedAt: now / 1000 - STALE_SECONDS - 1 }, { paused: true }]) assert.throws(() => assertMarket({ ...oracle, ...change }, pool, now));
  assert.throws(() => assertMarket(oracle, null, now), /No active/);
});

test("exact-input/slippage validation and minOut remain bigint and bounded", () => {
  assert.deepEqual(tradeInput("1.000001", "0.50"), { amountIn: 1_000_001n, bps: 50n });
  for (const amount of ["", "0", "-1", "NaN", "Infinity", "1e2", "0.0000001", maxUint256.toString(), "9".repeat(81)]) assert.throws(() => tradeInput(amount, "0.50"));
  for (const slip of ["", "0", "-1", "NaN", "Infinity", "1e2", "5.01", "0.001", "100", " 0.50"]) assert.throws(() => tradeInput("1", slip));
  assert.equal(tradeInput("1", "5.00").bps, 500n);
  assert.equal(minimumOutput(9007199254740993n, 50n), 8962163258467288n);
  assert.throws(() => minimumOutput(1n, 50n));
});

test("quote invalidates at expiry and on account, chain, revision, asset, amount or slippage changes", () => {
  assert.doesNotThrow(() => assertQuote(quote, context, now));
  assert.throws(() => assertQuote(quote, context, quote.expiresAt), /expired/);
  assert.throws(() => assertQuote(quote, context, now - 1), /expired/);
  assert.throws(() => assertQuote(quote, null, now));
  for (const change of [{ account: other }, { chainId: 1 }, { revision: 2 }, { token: TOKENS[1].token }, { amount: "2" }, { slippage: "1" }]) assert.throws(() => assertQuote(quote, { ...context, ...change }, now), /changed/);
  assert.throws(() => assertQuote({ ...quote, minOut: 1n }, context, now), /mismatch/);
  assert.throws(() => assertQuote(quote, { ...context, side: "sell" }, now), /changed/);
  assert.throws(() => assertQuote({ ...quote, decimals: 6 }, context, now), /decimals/);
});

test("sell uses exact stock decimals, USDC output and direction-bound quote checks", () => {
  const sellContext: TradeContext = { ...context, side: "sell", amount: "1.00000001" };
  const sellQuote: Quote = { ...quote, context: sellContext, amountIn: 100_000_001n, decimals: 6 };
  assert.deepEqual(tradeInput(sellContext.amount, "0.50", 8), { amountIn: 100_000_001n, bps: 50n });
  assert.doesNotThrow(() => assertQuote(sellQuote, sellContext, now));
  assert.throws(() => assertQuote({ ...sellQuote, amountIn: 1_000_000n }, sellContext, now), /mismatch/);
  assert.throws(() => assertQuote({ ...sellQuote, tokenDecimals: 6 }, sellContext, now));
  for (const decimals of [-1, 256, NaN, 1.5]) assert.throws(() => tradeInput("1", "0.50", decimals));
  assert.throws(() => tradeInput("0.000000001", "0.50", 8));
});

function boundary() {
  const calls: string[] = [];
  const io: SigningBoundary = {
    current: () => context, now: () => now,
    revalidate: async () => { calls.push("validate"); },
    simulate: async action => { calls.push(`simulate:${action}`); },
    send: async action => { calls.push(`send:${action}`); return hash; },
    receipt: async () => { calls.push("receipt"); return { status: "success", transactionHash: hash }; },
    status: message => { calls.push(message); },
  };
  return { io, calls };
}

test("approval revalidates after receipt, and does not automatically send swap", async () => {
  const { io, calls } = boundary();
  await runSigningBoundary("approve", quote, io);
  assert.deepEqual(calls.filter(call => /^(validate|simulate:|send:|receipt$)/.test(call)), ["validate", "simulate:approve", "validate", "send:approve", "receipt", "validate"]);
  assert.equal(calls.includes("send:swap"), false);
});

test("approval success followed by fresh safety failure leaves swap blocked with allowance warning", async () => {
  for (const reason of ["US", "unknown geo", "stale", "paused", "premium exceeds 1%", "missing pool", "RPC error"]) {
    const { io, calls } = boundary(); let checks = 0;
    io.revalidate = async () => { if (++checks === 3) throw new Error(reason); };
    await assert.rejects(runSigningBoundary("approve", quote, io), /Approval confirmed, but swap remains blocked/);
    assert.equal(calls.includes("send:swap"), false);
  }
});

test("rejection, failed receipt, simulation error and changed context never claim successful swap", async () => {
  for (const mode of ["rejection", "receipt", "simulation", "context", "expiry", "gate"] as const) {
    const { io, calls } = boundary();
    if (mode === "rejection") io.send = async () => { throw Object.assign(new Error("User rejected"), { code: 4001 }); };
    if (mode === "receipt") io.receipt = async () => ({ status: "reverted", transactionHash: hash });
    if (mode === "simulation") io.simulate = async () => { throw new Error("Policy transfer rejected"); };
    if (mode === "context") io.simulate = async () => { io.current = () => ({ ...context, account: other }); };
    if (mode === "expiry") io.simulate = async () => { io.now = () => quote.expiresAt; };
    if (mode === "gate") io.revalidate = async () => { throw new Error("Unknown geo"); };
    await assert.rejects(runSigningBoundary("swap", quote, io));
    assert.equal(calls.some(call => call === "swap receipt confirmed."), false);
    if (["simulation", "context", "expiry", "gate"].includes(mode)) assert.equal(calls.includes("send:swap"), false);
  }
});

test("hash is pending only; successful swap requires a successful receipt", async () => {
  const { io, calls } = boundary();
  io.receipt = async () => {
    assert.equal(calls.includes("swap receipt confirmed."), false);
    assert.ok(calls.includes("swap submitted; waiting for receipt..."));
    return { status: "success", transactionHash: hash };
  };
  await runSigningBoundary("swap", quote, io);
  assert.ok(calls.includes("swap receipt confirmed."));
});

test("production signing adapter rejects the actual local geo policy before any wallet/RPC action", async () => {
  const originalFetch = globalThis.fetch;
  const provider = new MockProvider();
  globalThis.fetch = async () => GET(new Request("https://sharelens.example/api/geo"));
  try {
    const liveTimeQuote = { ...quote, createdAt: Date.now(), expiresAt: Date.now() + 60_000 };
    for (const action of ["approve", "swap"] as const) {
      const io = tradingBoundary(TOKENS[0], liveTimeQuote, provider, () => context, () => {});
      await assert.rejects(runSigningBoundary(action, liveTimeQuote, io), /no trusted Cloudflare geo context/);
    }
    assert.equal(provider.calls.length, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("production builder lock independently rejects otherwise trusted geo before wallet activity", async () => {
  const originalFetch = globalThis.fetch;
  const provider = new MockProvider();
  globalThis.fetch = async () => Response.json({ country: "TH", allowed: true, source: TRUSTED_GEO_SOURCE, checkedAt: Date.now(), reason: "" });
  try {
    for (const side of ["buy", "sell"] as const) {
      const current = { ...context, side };
      const liveQuote = { ...quote, context: current, amountIn: side === "buy" ? 1_000_000n : 100_000_000n, decimals: side === "buy" ? 8 : 6, createdAt: Date.now(), expiresAt: Date.now() + 60_000 };
      for (const action of ["approve", "swap"] as const) {
        await assert.rejects(runSigningBoundary(action, liveQuote, tradingBoundary(TOKENS[0], liveQuote, provider, () => current, () => {})), /Builder attribution is unconfigured/);
      }
    }
    assert.equal(provider.calls.length, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test("actual provider send boundary catches an account change during viem's asynchronous chain check", async () => {
  const provider = new MockProvider();
  let current = context;
  const request = provider.request.bind(provider);
  provider.request = async args => {
    const result = await request(args);
    if (args.method === "eth_chainId") current = { ...context, account: other };
    return result;
  };
  const liveTimeQuote = { ...quote, createdAt: Date.now(), expiresAt: Date.now() + 60_000 };
  const io = tradingBoundary(TOKENS[0], liveTimeQuote, provider, () => current, () => {});
  await assert.rejects(io.send("swap"), /changed/);
  assert.equal(provider.calls.some(call => call.method === "eth_sendTransaction"), false);
});

test("isolated test-only adapter encodes exact allowance, exact input, recipient, deadline and bigint minOut", async () => {
  const provider = new MockProvider();
  const requests: { to: Address; data: Hex; from: Address }[] = [];
  const original = provider.request.bind(provider);
  provider.request = async args => {
    if (args.method === "eth_sendTransaction") {
      requests.push(args.params![0] as typeof requests[number]);
      return hash; // Test-only response, never forwarded to a network.
    }
    return original(args);
  };
  const liveTimeQuote = { ...quote, createdAt: Date.now(), expiresAt: Date.now() + 60_000 };
  const io = tradingBoundary(TOKENS[0], liveTimeQuote, provider, () => context, () => {});
  await io.send("approve"); await io.send("swap");
  const approval = decodeFunctionData({ abi: erc20Abi, data: requests[0].data });
  assert.equal(approval.functionName, "approve");
  assert.deepEqual(approval.args, [other, quote.amountIn]);
  assert.notEqual(approval.args?.[1], maxUint256);
  const swap = decodeFunctionData({ abi: routerAbi, data: requests[1].data });
  const params = swap.args[0];
  assert.equal(params.recipient, account); assert.equal(params.tokenOut.toLowerCase(), TOKENS[0].token.toLowerCase());
  assert.equal(params.amountIn, quote.amountIn); assert.equal(params.amountOutMinimum, quote.minOut);
  assert.equal(params.deadline, BigInt(Math.floor(liveTimeQuote.expiresAt / 1000))); assert.equal(params.tickSpacing, 10);
  const sellContext: TradeContext = { ...context, side: "sell" };
  const sellQuote: Quote = { ...liveTimeQuote, context: sellContext, amountIn: 100_000_000n, decimals: 6 };
  const sell = tradingBoundary(TOKENS[0], sellQuote, provider, () => sellContext, () => {});
  await sell.send("approve"); await sell.send("swap");
  assert.equal(requests[2].to.toLowerCase(), TOKENS[0].token.toLowerCase());
  assert.deepEqual(decodeFunctionData({ abi: erc20Abi, data: requests[2].data }).args, [other, sellQuote.amountIn]);
  const sellParams = decodeFunctionData({ abi: routerAbi, data: requests[3].data }).args[0];
  assert.equal(sellParams.tokenIn.toLowerCase(), TOKENS[0].token.toLowerCase());
  assert.equal(sellParams.tokenOut.toLowerCase(), USDC.toLowerCase());
  assert.equal(sellParams.amountIn, sellQuote.amountIn);
  assert.equal(sellParams.amountOutMinimum, sellQuote.minOut);
  assert.equal(sellParams.recipient, account);
});

test("post-approval account changes and expiry are blocked, with an allowance warning", async () => {
  for (const mode of ["account", "expiry"]) {
    const { io } = boundary();
    io.receipt = async () => {
      if (mode === "account") io.current = () => ({ ...context, account: other });
      else io.now = () => quote.expiresAt;
      return { status: "success", transactionHash: hash };
    };
    await assert.rejects(runSigningBoundary("approve", quote, io), /Approval confirmed, but swap remains blocked.*allowance/);
  }
});
