"use client";

import { useEffect, useRef, useState } from "react";
import { formatUnits, type Hash } from "viem";
import { readBalances } from "../lib/balances";
import { assertGeo, type Geo } from "../lib/geo";
import { CHAIN_ID, type Token } from "../lib/tokens";
import { BUILDER_BLOCKER, assertQuote, fetchGeo, requestQuote, runSigningBoundary, tradeInput, tradingBoundary, type Quote, type TradeContext } from "../lib/trade";
import { walletError } from "../lib/wallet";
import type { Wallet } from "./wallet";

export function useBalances(asset: Token, wallet: Wallet) {
  const [result, setResult] = useState<{ revision: number; value?: Awaited<ReturnType<typeof readBalances>>; error?: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setRefresh(value => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const { account, chainId, revision } = wallet.state;
    setResult(null);
    if (account && chainId === CHAIN_ID) void readBalances(asset, account).then(
      value => { if (!cancelled) setResult({ revision, value }); },
      error => { if (!cancelled) setResult({ revision, error: walletError(error) }); },
    );
    return () => { cancelled = true; };
  }, [asset, wallet.state.account, wallet.state.chainId, wallet.state.revision, refresh]);
  return { result: result?.revision === wallet.state.revision ? result : null, refresh: () => setRefresh(value => value + 1) };
}

export function BuyStation({ asset, wallet, balances, marketBlocker, marketStatus, tokenDecimals }: {
  asset: Token; wallet: Wallet; balances: ReturnType<typeof useBalances>; marketBlocker: string; marketStatus?: "ok" | "warn" | "stop" | "stale" | "paused" | "unavailable"; tokenDecimals?: number;
}) {
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.50");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const input = useRef({ amount, slippage, side });
  const [geo, setGeo] = useState<Geo | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("No quote requested. Enter an amount to inspect the real pool quote.");
  const [hash, setHash] = useState<Hash | null>(null);
  const [now, setNow] = useState(0);
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const pollGeo = () => void fetchGeo().then(value => { if (mounted.current) setGeo(value); }, () => { if (mounted.current) setGeo(null); });
    pollGeo();
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    const geoTimer = setInterval(pollGeo, 20_000);
    return () => { mounted.current = false; generation.current++; clearInterval(clock); clearInterval(geoTimer); };
  }, []);

  function context(): TradeContext | null {
    const state = wallet.controller?.getState();
    return state?.account && !state.busy ? { account: state.account, chainId: state.chainId ?? 0, revision: state.revision, token: asset.token, ...input.current } : null;
  }
  let inputError = "";
  try {
    if (side === "sell" && tokenDecimals === undefined) throw new Error("Token decimals unavailable. Wait for verified market data.");
    tradeInput(amount, slippage, side === "buy" ? 6 : tokenDecimals);
  } catch (error) { inputError = walletError(error); }
  let currentQuote = quote;
  try { if (quote) assertQuote(quote, context(), now); } catch { currentQuote = null; }
  let geoBlocker = "";
  try { if (!geo) throw new Error("Country unknown: geo check unavailable."); assertGeo(geo, now); }
  catch (error) { geoBlocker = walletError(error); }
  const walletBlocker = !wallet.state.account ? "Connect a wallet to read balances and request a quote." : wallet.state.chainId !== CHAIN_ID ? "Switch your wallet to Base mainnet." : "";
  const blockers = [geoBlocker, BUILDER_BLOCKER, marketBlocker, walletBlocker].filter(Boolean);
  const guardState = marketStatus === "stop" ? "stop" : marketStatus === "warn" ? "warn" : marketStatus === "stale" || marketStatus === "paused" ? "locked" : marketStatus === "unavailable" ? "unavailable" : "ok";
  const paySymbol = side === "buy" ? "USDC" : asset.symbol;
  const receiveSymbol = side === "buy" ? asset.symbol : "USDC";

  function edit(next: { amount: string; slippage: string; side: "buy" | "sell" }) {
    input.current = next; generation.current++; setQuote(null); setHash(null); setAmount(next.amount); setSlippage(next.slippage); setSide(next.side);
    setStatus("Order changed. Request a new quote; previous approvals are not revoked.");
  }
  async function getQuote() {
    const current = context();
    if (!current || inputError || busy) return;
    const request = ++generation.current;
    setBusy(true); setQuote(null); setStatus("Calling the verified Aerodrome quoter. No signature required...");
    try {
      const result = await requestQuote(asset, current);
      assertQuote(result, context(), Date.now());
      if (mounted.current && request === generation.current) { setQuote(result); setNow(Date.now()); setStatus("Quoter simulation returned. Quote is not a swap receipt or an eligibility check."); }
    } catch (error) { if (mounted.current && request === generation.current) setStatus(walletError(error)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function sign(action: "approve" | "swap") {
    if (busy || blockers.length || !currentQuote || !wallet.controller) return;
    setBusy(true); setHash(null);
    try {
      const io = tradingBoundary(asset, currentQuote, wallet.controller.provider,
        () => mounted.current ? context() : null,
        (message, transaction) => { if (mounted.current) { setStatus(message); if (transaction) setHash(transaction); } });
      await runSigningBoundary(action, currentQuote, io);
      if (mounted.current) { balances.refresh(); if (action === "swap") { setQuote(null); setStatus("Swap confirmed by a successful Base receipt. Refreshing balances."); } }
    } catch (error) { if (mounted.current) setStatus(walletError(error)); }
    finally { if (mounted.current) setBusy(false); }
  }

  return <section className="card buy-station" aria-labelledby="buy-title">
    <div className="station-heading"><div className="instrument-preview"><svg viewBox="0 0 64 48" aria-hidden="true"><path d="M8 8h40v6h8v26H16v-6H8z" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M17 17h22v4H17zm0 9h14v4H17zm25-2h6v10h-6z" fill="currentColor"/></svg><div><p className="eyebrow">B20 / {asset.name}</p><h2 id="buy-title">Buy / Sell Station</h2><span>{asset.symbol} / BASE 8453 / EXACT INPUT</span></div></div><span className="mode-badge">{blockers.length ? "EXECUTION LOCKED" : "MANUAL CONTROL"}</span></div>
    <div className="side-tabs" role="tablist" aria-label="Order direction">
      {(["buy", "sell"] as const).map(direction => <button key={direction} id={`${direction}-tab`} type="button" role="tab" aria-selected={side === direction} aria-controls="order-panel" tabIndex={side === direction ? 0 : -1} disabled={busy}
        onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "buy" : event.key === "End" ? "sell" : side === "buy" ? "sell" : "buy"; edit({ amount: "", slippage, side: next }); document.getElementById(`${next}-tab`)?.focus(); } }}
        onClick={() => { if (side !== direction) edit({ amount: "", slippage, side: direction }); }}>{direction.toUpperCase()}</button>)}
    </div>
    <div className="buy-grid" id="order-panel" role="tabpanel" aria-labelledby={`${side}-tab`}>
      <div className="order-entry">
        <label htmlFor="buy-amount">You pay / {paySymbol}</label>
        <input id="buy-amount" inputMode="decimal" autoComplete="off" placeholder="Enter amount" value={amount} maxLength={80} disabled={busy} aria-invalid={Boolean(amount && inputError)} aria-describedby="buy-validation" onChange={event => edit({ amount: event.target.value, slippage, side })} />
        <p className="source">Base {paySymbol} balance: {balances.result?.value ? side === "buy" ? formatUnits(balances.result.value.usdc, 6) : formatUnits(balances.result.value.raw, balances.result.value.decimals) : wallet.state.account ? "Unavailable / loading" : "Connect wallet"}</p>
        <label htmlFor="slippage">Slippage tolerance / %</label>
        <input id="slippage" inputMode="decimal" autoComplete="off" maxLength={8} value={slippage} disabled={busy} aria-describedby="buy-validation" onChange={event => edit({ amount, slippage: event.target.value, side })} />
        <p className="source" id="buy-validation">{inputError || "Exact input. Tolerance 0.01% to 5.00%; default 0.50%."}</p>
      </div>
      <div className="quote-readout" aria-live="polite">
        <h3>You receive / {receiveSymbol}</h3>
        <p className="value">{currentQuote ? formatUnits(currentQuote.amountOut, currentQuote.decimals) : "Not quoted"}</p>
        <p>{currentQuote ? `${formatUnits(currentQuote.scaled, currentQuote.tokenDecimals)} equivalent shares ${side === "buy" ? "received" : "sold"}` : "No spot estimate substituted."}</p>
        <div className="metric"><span>Minimum received</span><strong>{currentQuote ? formatUnits(currentQuote.minOut, currentQuote.decimals) : "--"}</strong></div>
        <p className="source">{currentQuote ? `Aerodrome Quoter / block ${currentQuote.block} / expires in ${Math.max(0, Math.ceil((currentQuote.expiresAt - now) / 1000))}s` : quote ? "Quote expired or context changed. Request a new quote." : "Aerodrome Slipstream exact-input simulation"}</p>
        <p className="source">Network gas is extra, paid in ETH. Builder attribution is not configured; no attribution is claimed. Execution is disabled on this host.</p>
      </div>
      <div className="actions">
        <button type="button" className={`primary buy-guard-${guardState}`} data-state={guardState} aria-label={`Buy, Premium Guard ${guardState}`} disabled={busy || Boolean(inputError || walletBlocker || marketBlocker)} onClick={() => void getQuote()}><span>{busy ? "Working..." : "BUY"}</span><small>GUARD: {guardState.toUpperCase()}</small></button>
        <button type="button" disabled={busy || blockers.length > 0 || !currentQuote} onClick={() => void sign("approve")}>1. Approve exact {paySymbol}</button>
        <button type="button" disabled={busy || blockers.length > 0 || !currentQuote} onClick={() => void sign("swap")}>2. Swap to {receiveSymbol}</button>
        <p className="source">You review and sign each step. No unlimited approval. Every signing boundary rechecks all gates, including after approval.</p>
      </div>
    </div>
    <div className="trade-lock" aria-label="Trading restrictions"><strong>Safety interlock</strong><ul>{blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul><p>Geo is a coarse risk signal, not KYC or proof of eligibility. No self-certified country bypass.</p></div>
    <p className="transaction-status" role="status">{status}</p>
    {hash && <a className="address" href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noreferrer">Transaction receipt / {hash}</a>}
  </section>;
}
