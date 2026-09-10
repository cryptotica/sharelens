"use client";

import { useEffect, useState } from "react";
import { createWallet, emptyWallet, selectPreferredProvider, type AnnouncedProvider, type InjectedProvider } from "../lib/wallet";

async function discoverProviders(fallback?: InjectedProvider) {
  const announced: AnnouncedProvider[] = [];
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<AnnouncedProvider>).detail;
    if (detail?.provider && typeof (detail.provider as { request?: unknown }).request === "function" && !announced.some(item => item.provider === detail.provider)) announced.push(detail);
  };
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise(resolve => setTimeout(resolve, 250));
  window.removeEventListener("eip6963:announceProvider", onAnnounce);
  if (fallback && !announced.some(item => item.provider === fallback)) announced.push({ info: { name: "Browser wallet" }, provider: fallback });
  return announced;
}

function providerName(item: AnnouncedProvider, index: number) {
  return typeof item.info?.name === "string" && item.info.name.trim() ? item.info.name : `Wallet ${index + 1}`;
}

export function useWallet() {
  const [state, setState] = useState(emptyWallet);
  const [controller, setController] = useState<ReturnType<typeof createWallet> | null>(null);
  const [providers, setProviders] = useState<AnnouncedProvider[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void discoverProviders((window as Window & { ethereum?: InjectedProvider }).ethereum).then(setProviders); }, []);
  useEffect(() => () => controller?.destroy(), [controller]);
  async function connect(requestedProvider?: InjectedProvider) {
    setError("");
    let wallet = controller;
    if (!wallet) {
      const options = providers.length ? providers : await discoverProviders((window as Window & { ethereum?: InjectedProvider }).ethereum);
      setProviders(options);
      const provider = requestedProvider ?? selectPreferredProvider(options);
      if (!provider?.request || !provider.on || !provider.removeListener) {
        setError("No injected wallet found. Open this page in an EIP-1193 wallet browser or enable your wallet extension.");
        return;
      }
      wallet = createWallet(provider, setState);
      setController(wallet);
    }
    void wallet.connect();
  }
  return { state, controller, connect, providers, error: state.error || error };
}

export type Wallet = ReturnType<typeof useWallet>;

export function WalletControl({ wallet }: { wallet: Wallet }) {
  const { state, controller, providers } = wallet;
  return <div className="wallet-control">
    <span className="network"><span className="led" aria-hidden="true" /> BASE / 8453</span>
    {state.account ? <>
      <span className="wallet-address" title={state.account}>{state.account.slice(0, 6)}...{state.account.slice(-4)}</span>
      {state.chainId !== 8453 && <button type="button" onClick={() => void controller?.switchBase()}>Switch to Base</button>}
      <button type="button" onClick={() => controller?.disconnect()}>Disconnect</button>
    </> : <>
      {providers.length > 1 && <div className="wallet-options" role="group" aria-label="Choose wallet">
        {providers.map((item, index) => <button key={`${providerName(item, index)}-${index}`} type="button" disabled={state.busy} onClick={() => void wallet.connect(item.provider)}>Connect {providerName(item, index)}</button>)}
      </div>}
      <button className="primary" type="button" disabled={state.busy} onClick={() => void wallet.connect()}>{state.busy ? "Wallet pending..." : "Connect wallet"}</button>
    </>}
    {state.busy && <button type="button" onClick={() => controller?.disconnect()}>Cancel connection</button>}
    <span className="source">Disconnect clears this session, not wallet permissions.</span>
  </div>;
}
