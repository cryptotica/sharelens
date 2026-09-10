import { getAddress, isAddress, type Address } from "viem";
import { CHAIN_ID } from "./tokens";

export type InjectedProvider = {
  request(args: { method: string; params?: readonly unknown[] }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
};
export type AnnouncedProvider = { info?: { name?: unknown; rdns?: unknown }; provider: InjectedProvider };
export type WalletState = { account: Address | null; chainId: number | null; revision: number; busy: boolean; error: string };
export const emptyWallet: WalletState = { account: null, chainId: null, revision: 0, busy: false, error: "" };

export function selectPreferredProvider(announced: readonly AnnouncedProvider[], fallback?: InjectedProvider) {
  const coinbase = announced.find(({ info }) => info?.rdns === "com.coinbase.wallet" || (typeof info?.name === "string" && /coinbase wallet/i.test(info.name)));
  return coinbase?.provider ?? announced[0]?.provider ?? fallback ?? null;
}

export function walletError(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === 4001) return "Wallet request rejected. Nothing was confirmed.";
  if (error && typeof error === "object" && "shortMessage" in error) return String(error.shortMessage);
  return error instanceof Error ? error.message : "Wallet request failed. Please retry.";
}

export async function walletContext(provider: InjectedProvider) {
  const accounts = await provider.request({ method: "eth_accounts" });
  const chain = await provider.request({ method: "eth_chainId" });
  if (!Array.isArray(accounts) || accounts.some(value => typeof value !== "string" || !isAddress(value))) throw new Error("Invalid wallet accounts.");
  if (typeof chain !== "string" || !/^0x[0-9a-f]+$/i.test(chain) || !Number.isSafeInteger(Number(chain))) throw new Error("Invalid wallet chain.");
  return { account: accounts[0] ? getAddress(accounts[0]) : null, chainId: Number(chain) };
}

// ponytail: one injected EIP-1193 provider; no SDK, persistence or automatic account access.
export function createWallet(provider: InjectedProvider, changed: (state: WalletState) => void) {
  let state = { ...emptyWallet };
  let active = false;
  let generation = 0;
  let session = 0;
  const publish = (next: Partial<WalletState>) => { state = { ...state, ...next, revision: state.revision + 1 }; changed(state); };
  const refresh = async () => {
    const current = ++generation;
    publish({ account: null, chainId: null, busy: true, error: "" });
    try {
      const context = await walletContext(provider);
      if (active && current === generation) publish({ ...context, busy: false });
    } catch (error) {
      if (active && current === generation) publish({ account: null, chainId: null, busy: false, error: walletError(error) });
    }
  };
  const disconnect = () => { active = false; session++; generation++; publish({ account: null, chainId: null, busy: false, error: "" }); };
  const onChanged = () => { if (active) void refresh(); };
  provider.on("accountsChanged", onChanged);
  provider.on("chainChanged", onChanged);
  provider.on("disconnect", disconnect);
  return {
    provider,
    getState: () => state,
    async connect() {
      if (state.busy) return;
      active = true;
      const connection = ++session;
      const current = ++generation;
      publish({ account: null, chainId: null, busy: true, error: "" });
      try {
        await provider.request({ method: "eth_requestAccounts" });
        if (active && connection === session) await refresh();
      } catch (error) {
        if (active && connection === session && current === generation) publish({ busy: false, error: walletError(error) });
      }
    },
    async switchBase() {
      if (!active || state.busy) return;
      const connection = session;
      publish({ account: null, chainId: null, busy: true, error: "" });
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }] });
        if (active && connection === session) await refresh();
      } catch (error) {
        if (active && connection === session) { await refresh(); if (active && connection === session) publish({ error: `${walletError(error)} If Base is not added, add Base mainnet (8453) in your wallet.` }); }
      }
    },
    disconnect,
    destroy() {
      active = false; session++; generation++;
      provider.removeListener("accountsChanged", onChanged);
      provider.removeListener("chainChanged", onChanged);
      provider.removeListener("disconnect", disconnect);
    },
  };
}
