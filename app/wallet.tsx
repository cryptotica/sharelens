"use client";

import { useEffect, useState } from "react";
import { createWallet, emptyWallet, type AnnouncedProvider, type InjectedProvider } from "../lib/wallet";

type EthereumWithProviders = InjectedProvider & { providers?: InjectedProvider[] };


function isPhantom(provider: unknown, info?: AnnouncedProvider["info"]) {
  const value = provider as { isPhantom?: unknown } | undefined;
  return value?.isPhantom === true || info?.rdns === "app.phantom" || (typeof info?.name === "string" && /phantom/i.test(info.name));
}

async function discoverProviders(fallbacks: readonly InjectedProvider[]) {
  const announced: AnnouncedProvider[] = [];
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<AnnouncedProvider>).detail;
    if (detail?.provider && !isPhantom(detail.provider, detail.info) && typeof (detail.provider as { request?: unknown }).request === "function" && !announced.some(item => item.provider === detail.provider)) announced.push(detail);
  };
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise(resolve => setTimeout(resolve, 250));
  window.removeEventListener("eip6963:announceProvider", onAnnounce);
  for (const fallback of fallbacks) {
    if (fallback && !isPhantom(fallback) && !announced.some(item => item.provider === fallback)) {
      const name = (fallback as EthereumWithProviders & { isMetaMask?: boolean }).isMetaMask ? "MetaMask" : "Browser wallet";
      announced.push({ info: { name }, provider: fallback });
    }
  }
  return announced;
}

export function useWallet() {
  const [state, setState] = useState(emptyWallet);
  const [controller, setController] = useState<ReturnType<typeof createWallet> | null>(null);
  const [providers, setProviders] = useState<AnnouncedProvider[]>([]);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => controller?.destroy(), [controller]);
  function providerName(item: AnnouncedProvider, index: number) {
    return typeof item.info?.name === "string" && item.info.name.trim() ? item.info.name : `Wallet ${index + 1}`;
  }
  function connectProvider(provider: InjectedProvider) {
    if (!provider.request || !provider.on || !provider.removeListener) {
      setError("This wallet provider is not compatible with EIP-1193.");
      return;
    }
    setChooserOpen(false);
    setProviders([]);
    const wallet = createWallet(provider, setState);
    setController(wallet);
    void wallet.connect();
  }

  async function connect() {
    setError("");
    if (controller) return void controller.connect();
    const injected = (window as Window & { ethereum?: EthereumWithProviders }).ethereum;
    const fallbacks = injected ? [injected, ...(injected.providers ?? [])] : [];
    const options = await discoverProviders(fallbacks);
    setProviders(options);
    setChooserOpen(true);
  }
  return { state, controller, connect, providers, chooserOpen, providerName, connectProvider, closeChooser: () => setChooserOpen(false), error: state.error || error };
}

export type Wallet = ReturnType<typeof useWallet>;

export function WalletControl({ wallet }: { wallet: Wallet }) {
  const { state, controller } = wallet;
  return <div className="wallet-control">
    <span className="network"><span className="led" aria-hidden="true" /> BASE / 8453</span>
    {state.account ? <>
      <span className="wallet-address" title={state.account}>{state.account.slice(0, 6)}...{state.account.slice(-4)}</span>
      {state.chainId !== 8453 && <button type="button" onClick={() => void controller?.switchBase()}>Switch to Base</button>}
      <button type="button" onClick={() => controller?.disconnect()}>Disconnect</button>
    </> : <>
      <button className="primary" type="button" disabled={state.busy} onClick={() => void wallet.connect()}>{state.busy ? "Wallet pending..." : "Connect wallet"}</button>
      {wallet.chooserOpen && <div className="wallet-options" role="dialog" aria-label="Choose wallet">
        <span>Choose wallet</span>
        {wallet.providers.map((item, index) => <button key={`${wallet.providerName(item, index)}-${index}`} type="button" onClick={() => wallet.connectProvider(item.provider)}>Connect {wallet.providerName(item, index)}</button>)}
        <button type="button" onClick={wallet.closeChooser}>Cancel</button>
      </div>}
    </>}
    {state.busy && <button type="button" onClick={() => controller?.disconnect()}>Cancel connection</button>}
    <span className="source">Disconnect clears this session, not wallet permissions.</span>
  </div>;
}
