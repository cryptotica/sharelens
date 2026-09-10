"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatUnits } from "viem";
import { parseAmount, readB20, readConversion } from "../lib/b20";
import { client } from "../lib/client";
import { oracleState, readOracle } from "../lib/oracle";
import { readPool } from "../lib/pool";
import { premium } from "../lib/premium";
import { basescan, CHAIN_ID, REGISTRY, TOKENS, type Token } from "../lib/tokens";
import { useWallet, WalletControl, type Wallet } from "./wallet";
import { BuyStation, useBalances } from "./buy-station";

type Snapshot = {
  block: bigint;
  b20: PromiseSettledResult<Awaited<ReturnType<typeof readB20>>>;
  oracle: PromiseSettledResult<Awaited<ReturnType<typeof readOracle>>>;
  pool: PromiseSettledResult<Awaited<ReturnType<typeof readPool>>>;
};

const messages: Record<"ok" | "warn" | "stop" | "stale" | "paused", string> = {
  ok: "Near or below reference",
  warn: "Slight premium. Watch slippage.",
  stop: "Above reference. Do not rush.",
  stale: "Stale reference. Do not use for decisions.",
  paused: "Paused reference. Do not use for decisions.",
};
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const errorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "shortMessage" in error) return String(error.shortMessage);
  return error instanceof Error ? error.message : "Unable to read Base mainnet. Please retry.";
};

function AssetView({ asset, wallet, children }: { asset: Token; wallet: Wallet; children: ReactNode }) {
  const balances = useBalances(asset, wallet);
  const [amount, setAmount] = useState("1.00");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(0);
  const [conversion, setConversion] = useState<{
    amount: string;
    block: bigint;
    scaled?: bigint;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const clock = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
    const poll = setInterval(() => setRefresh(value => value + 1), 60_000);
    return () => { clearInterval(clock); clearInterval(poll); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    setError("");
    async function load() {
      try {
        const [chainId, block] = await Promise.all([client.getChainId(), client.getBlockNumber()]);
        if (chainId !== CHAIN_ID) throw new Error("RPC is not connected to Base mainnet (8453).");
        // Keep all observations at one block, but let each source fail independently.
        const [b20, oracle, pool] = await Promise.allSettled([
          readB20(asset, block), readOracle(asset, block), readPool(asset, block),
        ]);
        if (!cancelled) {
          setNow(Math.floor(Date.now() / 1000));
          setSnapshot({ block, b20, oracle, pool });
        }
      } catch (cause) {
        if (!cancelled) setError(errorMessage(cause));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [asset, refresh]);

  const b20 = snapshot?.b20.status === "fulfilled" ? snapshot.b20.value : null;
  const oracle = snapshot?.oracle.status === "fulfilled" ? snapshot.oracle.value : null;
  const pool = snapshot?.pool.status === "fulfilled" ? snapshot.pool.value : null;
  let amountError = "";
  if (b20) {
    try { parseAmount(amount, b20.decimals); } catch (cause) { amountError = errorMessage(cause); }
  }

  useEffect(() => {
    if (!b20 || amountError) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void readConversion(asset, amount, b20).then(
        value => { if (!cancelled) setConversion({ amount, block: b20.blockNumber, scaled: value.scaled }); },
        cause => { if (!cancelled) setConversion({ amount, block: b20.blockNumber, error: errorMessage(cause) }); },
      );
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [asset, amount, amountError, b20]);

  const currentConversion = b20 && conversion?.amount === amount && conversion.block === b20.blockNumber ? conversion : null;
  let state: ReturnType<typeof oracleState> | null = null;
  let stateError = "";
  if (oracle) {
    try { state = oracleState(oracle.updatedAt, now, oracle.paused); }
    catch (cause) { stateError = errorMessage(cause); }
  }
  const reference = oracle ? { numerator: oracle.answer, denominator: 10n ** BigInt(oracle.decimals) } : null;
  const guard = pool && reference && state ? premium(pool, reference, state) : null;
  const loading = !snapshot && !error;
  const noPool = snapshot?.pool.status === "fulfilled" && !pool;

  return <>
    <div className="player-strip" aria-label="Wallet and currency" aria-live="polite">
      <span><b>PLAYER /</b> {wallet.state.account ? `${wallet.state.account.slice(0, 6)}...${wallet.state.account.slice(-4)}` : "GUEST"}</span>
      <span><b>USDC /</b> {balances.result?.value ? formatUnits(balances.result.value.usdc, 6) : "--"}</span>
      <span><b>INVENTORY /</b> {asset.symbol}</span>
      <WalletControl wallet={wallet} />
    </div>
    <div className="trading-desk">
      {children}
      <section className="preview-console" aria-labelledby="preview-title" aria-busy={loading}>
        <div className="preview-caption"><span>INSTRUMENT VIEW</span><span>B20 / BASE</span></div>
        <div className="preview-stage" aria-hidden="true">
          <svg viewBox="0 0 120 100" shapeRendering="crispEdges"><path d="M24 12h64v8h12v64H36v-8H24z" fill="#002a96"/><path d="M16 8h64v8h12v60H28v-8H16z" fill="#d5e6ff"/><path d="M24 16h48v8h12v44H32v-8h-8z" fill="#0052ff"/><path d="M34 30h34v6H34zm0 12h24v6H34zm0 12h16v6H34z" fill="#d5e6ff"/><path d="M78 68h26v8h8v16H86v-8h-8z" fill="#ffda63"/><path d="M86 76h18v8H86z" fill="#8c641d"/></svg>
          <span>{asset.symbol}</span>
        </div>
        <p className="eyebrow">Selected instrument / tokenized equity</p>
        <h2 id="preview-title">{asset.name}</h2>
        <dl className="preview-stats">
          <div><dt>Pool / token</dt><dd>{pool ? money(Number(pool.numerator) / Number(pool.denominator)) : "--"}</dd></div>
          <div><dt>Reference / TR</dt><dd>{reference ? money(Number(reference.numerator) / Number(reference.denominator)) : "--"}</dd></div>
          <div><dt>Premium</dt><dd>{guard?.percent != null ? `${guard.percent > 0 ? "+" : ""}${guard.percent.toFixed(2)}%` : "--"}</dd></div>
          <div><dt>Feed state</dt><dd>{state ?? "Unavailable"}</dd></div>
        </dl>
        <p className="preview-notice">{guard ? messages[guard.status as keyof typeof messages] : "Awaiting verified market checks."}</p>
        <p className="source">Live observations, not an executable quote. Inspect sources and freshness in the HUD below.</p>
        <div className="preview-caption"><span>MANUAL ONLY</span><span>NO AUTO-SWAP</span></div>
      </section>
      <BuyStation asset={asset} wallet={wallet} balances={balances} tokenDecimals={b20?.decimals} marketStatus={(!guard ? "unavailable" : guard.status) as "ok" | "warn" | "stop" | "stale" | "paused" | "unavailable"} marketBlocker={!guard ? "Market checks unavailable or loading. Trading blocked." : guard.status === "stale" || guard.status === "paused" ? `Reference is ${guard.status}. Trading blocked.` : guard.status === "stop" ? "Premium exceeds 1.00%. Trading blocked." : ""} />
    </div>
    <div className="observation">
      <span>{snapshot ? `Base block ${snapshot.block.toString()} | refreshes every 60s` : "Public RPC | Base mainnet 8453"}</span>
      <button type="button" disabled={loading} onClick={() => { setSnapshot(null); setRefresh(value => value + 1); }}>Refresh data</button>
    </div>
    {error && <p className="error" role="alert">Base read failed: {error} Use Refresh data to retry.</p>}
    <div className="market-hud">
      <section className="card lens" aria-labelledby="lens-title" aria-busy={loading}>
        <div className="lens-conversion">
        <p className="eyebrow">01 / Underlying shares</p>
        <h2 id="lens-title">Dividend Lens</h2>
        <label htmlFor="amount">Amount of {asset.symbol} tokens</label>
        <input id="amount" inputMode="decimal" autoComplete="off" value={amount}
          aria-invalid={Boolean(amountError)} aria-describedby="conversion-note"
          onChange={event => setAmount(event.target.value)} />
        {loading && <p className="skeleton" role="status">Loading live multiplier...</p>}
        {snapshot?.b20.status === "rejected" && <p className="error" role="alert">Multiplier unavailable: {errorMessage(snapshot.b20.reason)}</p>}
        {b20 && <>
          <div className="conversion" aria-live="polite">
            {amountError ? <p className="error" role="alert">{amountError}</p>
              : currentConversion?.error ? <p className="error" role="alert">Conversion unavailable: {currentConversion.error}</p>
              : currentConversion?.scaled !== undefined ? <>
                <p className="value">{Number(formatUnits(currentConversion.scaled, b20.decimals)).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 })}</p>
                <p>Equivalent {asset.name} shares</p>
              </> : <p className="skeleton" role="status">Converting onchain...</p>}
          </div>
          <p className="source" id="conversion-note">B20 toScaledBalance / toRawBalance helpers | {b20.decimals} decimals</p>
          <div className="metric"><span>Multiplier</span><strong>{formatUnits(b20.multiplier * 1_000_000n / b20.wad, 6)}x</strong></div>
          <p className="source">B20 multiplier() / WAD_PRECISION() | same Base block</p>
        </>}
        </div>
        <div>
        <div className="wallet-readout" aria-live="polite">
          <h3>Your holdings / Base</h3>
          {!wallet.state.account ? <p>Connect a wallet to inspect your actual holdings.</p> : wallet.state.chainId !== CHAIN_ID ? <p>Wrong wallet network. Switch to Base above.</p> : balances.result?.error ? <p className="error">Balance read failed: {balances.result.error}</p> : balances.result?.value ? <>
            <p className="balance-value">{formatUnits(balances.result.value.raw, balances.result.value.decimals)} <span>{asset.symbol} tokens</span></p>
            <p className="balance-value">{formatUnits(balances.result.value.scaled, balances.result.value.decimals)} <span>equivalent shares</span></p>
            <p className="source">balanceOf / scaledBalanceOf / Base block {balances.result.value.block.toString()} / refreshes every 30s</p>
            <details><summary>Exact raw base units</summary><p className="address">{balances.result.value.raw.toString()} raw / {balances.result.value.scaled.toString()} scaled</p></details>
          </> : <p role="status">Reading live balances...</p>}
        </div>
        <details className="notes"><summary>Lens / how shares work</summary><p className="explanation">1 B20 token does not always equal 1 share. Cash dividends are reinvested into shares and folded into the multiplier; your token balance does not change and no USDC dividend arrives in your wallet.</p></details>
        </div>
      </section>

      {noPool ? <section className="card" aria-labelledby="no-pool-title">
        <p className="eyebrow">02 / Pool unavailable</p>
        <h2 id="no-pool-title">No active pool</h2>
        <p>No configured Aerodrome USDC pool with active liquidity was found. Premium Guard is hidden; no price is estimated. Dividend Lens remains available.</p>
      </section> : <section className={`card guard ${guard?.status ?? (state && state !== "fresh" ? state : "")}`} aria-labelledby="guard-title" aria-busy={loading}>
        <div className="guard-heading"><p className="eyebrow">02 / Reference vs. market</p>
        <h2 id="guard-title">Premium Guard</h2></div>
        {loading && <p className="skeleton" role="status">Loading Chainlink and Aerodrome...</p>}
        <div className="guard-prices">
        <div className="price">
          <h3>Chainlink reference</h3>
          <p className="value">{reference ? money(Number(reference.numerator) / Number(reference.denominator)) : "Unavailable"}</p>
          <p className="source"><a href={basescan(asset.feed)} target="_blank" rel="noreferrer">Chainlink feed</a> | total return{oracle ? ` | ${oracle.decimals} decimals` : ""}</p>
          {oracle && <>
            <p className="timestamp">updatedAt: <time dateTime={new Date(oracle.updatedAt * 1000).toISOString()}>{new Date(oracle.updatedAt * 1000).toLocaleString()}</time> (local time)</p>
            <p className="source">Feed: <strong>{state ?? "invalid"}</strong> | <a href={basescan(REGISTRY)} target="_blank" rel="noreferrer">Registry pause</a>: {oracle.paused ? "paused" : "not paused"}</p>
          </>}
          {snapshot?.oracle.status === "rejected" && <p className="error" role="alert">Reference / pause check unavailable: {errorMessage(snapshot.oracle.reason)}</p>}
          {stateError && <p className="error" role="alert">{stateError}</p>}
        </div>
        <div className="price">
          <h3>Aerodrome pool price</h3>
          <p className="value">{pool ? money(Number(pool.numerator) / Number(pool.denominator)) : "Unavailable"}</p>
          <p className="source">{asset.pool && <a href={basescan(asset.pool)} target="_blank" rel="noreferrer">Aerodrome Slipstream / USDC pool</a>} | spot per token</p>
          {pool && <p className="source">Pair verified onchain | fee {(pool.fee / 10_000).toFixed(2)}% | USDC treated as $1</p>}
          {snapshot?.pool.status === "rejected" && <p className="error" role="alert">Pool read failed: {errorMessage(snapshot.pool.reason)}</p>}
        </div>
        <div className="premium" aria-live="polite">
          <strong>{guard ? messages[guard.status as keyof typeof messages] : "Premium unavailable"}</strong>
          {guard?.percent != null && <p className="value">{guard.percent > 0 ? "+" : ""}{guard.percent.toFixed(2)}%</p>}
          {guard?.difference != null && <p>{money(guard.difference)} per token vs. reference</p>}
          <p className="source">(Aerodrome - Chainlink) / Chainlink. Total return already includes the multiplier; never applied twice.</p>
        </div>
        </div>
        <details className="notes"><summary>Guard / thresholds &amp; methodology</summary>
        <p className="source">Green: &lt; 0.30% | Yellow: 0.30% to 1.00% inclusive | Red: &gt; 1.00%. Status uses exact values before rounding. Negative values mean a discount.</p>
        <p className="explanation">Gray when paused or older than 36 hours. Feeds operate 24/5 and may stop during market closures, holidays or corporate actions. Spot prices are not executable quotes and exclude slippage.</p>
        </details>
      </section>}
    </div>
  </>;
}

export default function Home() {
  const [selected, setSelected] = useState<Token>(TOKENS[0]);
  const wallet = useWallet();
  return <main>
    <div className="console-title"><span>SHARELENS / EQUITY SHOP CONSOLE</span><span aria-hidden="true">_ &nbsp; [ B20 ]</span></div>
    <header><div className="brand"><svg className="logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 4h24v4h8v24h-8v8H8v-8H4V12h4z" fill="currentColor"/><path d="M12 12h20v16H12z" fill="#091329"/><path d="M16 16h12v4H16zm8 16h8v8h8v4H24z" fill="#83e8ff"/></svg><div><p className="eyebrow">A clearer view before you buy</p><h1>ShareLens<span>.</span></h1><p>Understand your shares. Check the premium.</p></div></div><span className="shop-label">EQUITY COUNTER<br />04 INSTRUMENTS / BASE</span></header>
    {wallet.error && <p className="error" role="alert">{wallet.error}</p>}
    <aside className="disclaimer"><strong>NON-US ONLY</strong><span>These assets are available only to eligible non-US users. This app does not verify eligibility. Not investment advice. Not endorsed by Base or Coinbase.</span></aside>
    <AssetView key={selected.token} asset={selected} wallet={wallet}>
      <section className="stock-list" aria-labelledby="stocks-title">
        <div className="inventory-label"><h2 id="stocks-title">Stock list</h2><span>04 / BASE</span></div>
        <div className="stock-columns" aria-hidden="true"><span>LOT / INSTRUMENT</span><span>SELECT</span></div>
        <nav className="tokens" aria-label="Select a B20 token">
          {TOKENS.map((asset, index) => <div className="instrument" key={asset.token}>
            <button type="button" aria-pressed={selected.token === asset.token} onClick={() => setSelected(asset)}><span className={`stock-icon stock-icon-${index}`} aria-hidden="true">{["N", "A", "M", "G"][index]}</span><span><strong>{asset.symbol}</strong><span>{asset.name}</span></span><span className="selection-mark" aria-hidden="true">{selected.token === asset.token ? ">" : "0" + (index + 1)}</span></button>
            <details className="verify"><summary>Verify {asset.symbol}</summary>
              <a className="address" href={basescan(asset.token)} target="_blank" rel="noreferrer">Token / {asset.token}</a>
              <a className="address" href={basescan(asset.feed)} target="_blank" rel="noreferrer">Chainlink / {asset.feed}</a>
              {asset.pool && <a className="address" href={basescan(asset.pool)} target="_blank" rel="noreferrer">Aerodrome pool / {asset.pool}</a>}
              <p className="source">Base 8453. Identity and pool pair checked onchain when read, never inferred from ticker.</p>
            </details>
          </div>)}
        </nav>
        <p className="source">Select an instrument to inspect, quote or trade. Verify addresses, not tickers.</p>
      </section>
    </AssetView>
    <footer><p>Verify addresses, not tickers. Public Base RPC data. Wallet connection does not grant spending permission. Trading is unavailable without trusted geo provenance.</p>
    </footer>
  </main>;
}
