import { createWalletClient, custom, erc20Abi, isAddressEqual, maxUint256, type Address, type EIP1193Provider, type Hash } from "viem";
import { base } from "viem/chains";
import { Attribution } from "ox/erc8021";
import { b20Abi, parseAmount } from "./b20";
import { client } from "./client";
import { assertGeo, type Geo } from "./geo";
import { oracleState, readOracle } from "./oracle";
import { readPool } from "./pool";
import { premium, type Ratio } from "./premium";
import { readExecutableQuote, routerAbi } from "./slipstream";
import { CHAIN_ID, USDC, type Token } from "./tokens";
import { walletContext, type InjectedProvider } from "./wallet";

export const BUILDER_CODE = "bc_1q35h6kr";
export const BUILDER_DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BUILDER_CODE] });
export const BUILDER_BLOCKER = "";
export type TradeContext = { account: Address; chainId: number; revision: number; token: Address; amount: string; slippage: string; side: "buy" | "sell" };
export type Quote = {
  context: TradeContext; amountIn: bigint; amountOut: bigint; minOut: bigint; scaled: bigint;
  decimals: number; tokenDecimals: number; router: Address; tickSpacing: number; block: bigint; createdAt: number; expiresAt: number;
};

export function tradeInput(amount: string, slippage: string, decimals = 6) {
  if (amount.length > 80 || slippage.length > 8) throw new Error("Input too long.");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error("Invalid token decimals.");
  const amountIn = parseAmount(amount, decimals);
  if (amountIn <= 0n || amountIn === maxUint256) throw new Error("Enter a positive, limited token amount.");
  if (!/^\d+(\.\d{1,2})?$/.test(slippage)) throw new Error("Slippage must be a percentage with at most two decimals.");
  const bps = parseAmount(slippage, 2);
  if (bps < 1n || bps > 500n) throw new Error("Slippage must be between 0.01% and 5.00%.");
  return { amountIn, bps };
}

export function minimumOutput(amountOut: bigint, bps: bigint) {
  if (amountOut <= 0n || bps < 1n || bps > 500n) throw new Error("Invalid quote output or slippage.");
  const result = amountOut * (10_000n - bps) / 10_000n;
  if (result <= 0n) throw new Error("Minimum output rounds to zero.");
  return result;
}

export function assertQuote(quote: Quote, current: TradeContext | null, now: number) {
  if (!current || current.chainId !== CHAIN_ID || quote.context.chainId !== CHAIN_ID ||
      !isAddressEqual(current.account, quote.context.account) || !isAddressEqual(current.token, quote.context.token) ||
      current.revision !== quote.context.revision || current.amount !== quote.context.amount || current.slippage !== quote.context.slippage ||
      current.side !== quote.context.side || !["buy", "sell"].includes(current.side)) {
    throw new Error("Wallet, asset or input changed. Request a new quote.");
  }
  if (!Number.isFinite(now) || !Number.isFinite(quote.createdAt) || !Number.isFinite(quote.expiresAt) ||
      quote.createdAt > now || quote.expiresAt <= now || quote.expiresAt - quote.createdAt > 60_000) throw new Error("Quote expired. Request a new quote.");
  if (quote.decimals !== (current.side === "buy" ? quote.tokenDecimals : 6)) throw new Error("Quote decimals mismatch.");
  const { amountIn, bps } = tradeInput(current.amount, current.slippage, current.side === "buy" ? 6 : quote.tokenDecimals);
  if (amountIn !== quote.amountIn || quote.minOut !== minimumOutput(quote.amountOut, bps)) throw new Error("Quote input or minimum output mismatch.");
}

export function assertMarket(oracle: Awaited<ReturnType<typeof readOracle>>, pool: Ratio | null, now: number) {
  const state = oracleState(oracle.updatedAt, Math.floor(now / 1000), oracle.paused);
  if (state !== "fresh") throw new Error(`Reference is ${state}. Trading blocked.`);
  if (!pool) throw new Error("No active verified pool.");
  const reference = { numerator: oracle.answer, denominator: 10n ** BigInt(oracle.decimals) };
  if (premium(pool, reference, state).status === "stop") throw new Error("Premium exceeds 1.00%. Trading blocked.");
}

export async function fetchGeo(): Promise<Geo> {
  const response = await fetch("/api/geo", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Geo source unavailable.");
  const geo = await response.json() as Geo;
  if (typeof geo.allowed !== "boolean" || typeof geo.reason !== "string" || typeof geo.source !== "string") throw new Error("Invalid geo response.");
  return geo;
}

export async function requestQuote(asset: Token, context: TradeContext): Promise<Quote> {
  if (context.chainId !== CHAIN_ID || !isAddressEqual(context.token, asset.token) || !["buy", "sell"].includes(context.side)) throw new Error("Wrong quote context.");
  if (await client.getChainId() !== CHAIN_ID) throw new Error("Wrong RPC chain.");
  const block = await client.getBlock();
  if (Math.abs(Date.now() / 1000 - Number(block.timestamp)) > 30) throw new Error("RPC block is not fresh.");
  const createdAt = Date.now();
  const tokenDecimals = await client.readContract({ address: asset.token, abi: erc20Abi, functionName: "decimals", blockNumber: block.number });
  const { amountIn, bps } = tradeInput(context.amount, context.slippage, context.side === "buy" ? 6 : tokenDecimals);
  const pool = await readPool(asset, block.number);
  if (!pool) throw new Error("No active pool.");
  const result = await readExecutableQuote(asset, amountIn, pool.tickSpacing, block.number, context.side);
  const decimals = context.side === "buy" ? tokenDecimals : 6;
  const scaled = await client.readContract({ address: asset.token, abi: b20Abi, functionName: "toScaledBalance", args: [context.side === "buy" ? result.amountOut : amountIn], blockNumber: block.number });
  return { context, amountIn, amountOut: result.amountOut, minOut: minimumOutput(result.amountOut, bps), scaled, decimals, tokenDecimals, router: result.deployment.router, tickSpacing: pool.tickSpacing, block: block.number, createdAt, expiresAt: createdAt + 60_000 };
}

type Action = "approve" | "swap";
type Receipt = { status: "success" | "reverted"; transactionHash: Hash };
export type SigningBoundary = {
  current(): TradeContext | null;
  now(): number;
  revalidate(): Promise<void>;
  simulate(action: Action): Promise<void>;
  send(action: Action): Promise<Hash>;
  receipt(hash: Hash): Promise<Receipt>;
  status(message: string, hash?: Hash): void;
};

// Shared orchestration is tested with test-only adapters; production uses fresh RPC/geo reads below.
export async function runSigningBoundary(action: Action, quote: Quote, io: SigningBoundary) {
  const check = () => assertQuote(quote, io.current(), io.now());
  check();
  io.status("Checking fresh geo, oracle, pool, wallet and quote...");
  await io.revalidate(); check();
  io.status(`Simulating ${action}...`);
  await io.simulate(action); check();
  // Simulation and approval mining can take time. Re-read all gates, not just UI state.
  await io.revalidate(); check();
  io.status(`Confirm ${action} in your wallet. No success until receipt.`);
  const hash = await io.send(action);
  io.status(`${action} submitted; waiting for receipt...`, hash);
  const receipt = await io.receipt(hash);
  if (receipt.status !== "success") throw new Error(`${action} reverted. No successful ${action} receipt. Transaction: ${receipt.transactionHash}`);
  io.status(`${action} receipt confirmed.`, receipt.transactionHash);
  if (action === "approve") {
    try { check(); await io.revalidate(); check(); }
    catch (error) { throw new Error(`Approval confirmed, but swap remains blocked. The exact allowance may remain. ${error instanceof Error ? error.message : "Revalidation failed."}`); }
  }
  return receipt;
}

export function tradingBoundary(asset: Token, quote: Quote, provider: InjectedProvider,
  current: () => TradeContext | null, status: SigningBoundary["status"]): SigningBoundary {
  const wallet = createWalletClient({ chain: base, dataSuffix: BUILDER_DATA_SUFFIX, transport: custom({
    async request(args: { method: string; params?: readonly unknown[] }) {
      // viem may await chain checks before sending. Check context again at the actual provider boundary.
      if (args.method === "eth_sendTransaction" || args.method === "wallet_sendTransaction") assertQuote(quote, current(), Date.now());
      return provider.request(args);
    },
  } as EIP1193Provider) });
  const tokenIn = quote.context.side === "buy" ? USDC : asset.token;
  const tokenOut = quote.context.side === "buy" ? asset.token : USDC;
  const approval = { address: tokenIn, abi: erc20Abi, functionName: "approve", args: [quote.router, quote.amountIn], account: quote.context.account } as const;
  const swap = { address: quote.router, abi: routerAbi, functionName: "exactInputSingle", account: quote.context.account,
    args: [{ tokenIn, tokenOut, tickSpacing: quote.tickSpacing, recipient: quote.context.account,
      deadline: BigInt(Math.floor(quote.expiresAt / 1000)), amountIn: quote.amountIn, amountOutMinimum: quote.minOut, sqrtPriceLimitX96: 0n }] } as const;
  return {
    current, now: Date.now, status,
    async revalidate() {
      assertGeo(await fetchGeo(), Date.now());
      const context = await walletContext(provider);
      if (!context.account || context.chainId !== CHAIN_ID || !isAddressEqual(context.account, quote.context.account)) throw new Error("Wallet changed.");
      const fresh = await requestQuote(asset, quote.context);
      const oracle = await readOracle(asset, fresh.block);
      const pool = await readPool(asset, fresh.block);
      assertMarket(oracle, pool, Date.now());
      // Guard the executable average price too, not only the pool's marginal spot.
      assertMarket(oracle, quote.context.side === "buy"
        ? { numerator: quote.amountIn * 10n ** BigInt(fresh.tokenDecimals), denominator: fresh.amountOut * 1_000_000n }
        : { numerator: fresh.amountOut * 10n ** BigInt(fresh.tokenDecimals), denominator: quote.amountIn * 1_000_000n }, Date.now());
      if (fresh.amountOut < quote.minOut || fresh.router !== quote.router || fresh.tickSpacing !== quote.tickSpacing || fresh.tokenDecimals !== quote.tokenDecimals) throw new Error("Executable quote changed beyond limits.");
      const balance = await client.readContract({ address: tokenIn, abi: erc20Abi, functionName: "balanceOf", args: [quote.context.account], blockNumber: fresh.block });
      if (balance < quote.amountIn) throw new Error("Insufficient input token balance.");
      assertGeo(await fetchGeo(), Date.now());
      const finalContext = await walletContext(provider);
      if (finalContext.account !== context.account || finalContext.chainId !== CHAIN_ID) throw new Error("Wallet changed during validation.");
      if (Date.now() - fresh.createdAt > 30_000) throw new Error("Validation took too long; retry.");
    },
    async simulate(action) {
      const allowance = await client.readContract({ address: tokenIn, abi: erc20Abi, functionName: "allowance", args: [quote.context.account, quote.router] });
      if (action === "approve") {
        if (allowance !== 0n) throw new Error("Existing allowance: use Swap if it is exactly this amount, otherwise revoke it in your wallet first.");
        const result = await client.simulateContract(approval);
        if (!result.result) throw new Error("Token approval simulation returned false.");
      } else {
        if (allowance !== quote.amountIn) throw new Error("Swap requires an allowance equal to this exact input, not an unlimited or different allowance.");
        await client.simulateContract(swap);
      }
    },
    async send(action) {
      assertQuote(quote, current(), Date.now());
      return action === "approve" ? wallet.writeContract(approval) : wallet.writeContract(swap);
    },
    async receipt(hash) {
      let replaced = false;
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000,
        onReplaced: replacement => { if (replacement.reason !== "repriced") replaced = true; },
      });
      if (replaced) throw new Error(`Transaction cancelled or replaced with a different transaction. Inspect ${receipt.transactionHash}; no ${hash} success claimed.`);
      return receipt;
    },
  };
}
