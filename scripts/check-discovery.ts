import { isAddressEqual, type Address } from "viem";
import { TOKENS, USDC } from "../lib/tokens";

type Pair = { chainId: string; dexId: string; pairAddress: Address; baseToken: { address: Address }; quoteToken: { address: Address }; liquidity?: { usd?: number } };
async function main() {
  for (const asset of TOKENS) {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${asset.token}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Discovery HTTP ${response.status}`);
    const data = await response.json() as { pairs?: Pair[] };
    const candidates = (data.pairs ?? []).filter(pair => pair.chainId === "base" && pair.dexId === "aerodrome" &&
      ((isAddressEqual(pair.baseToken.address, asset.token) && isAddressEqual(pair.quoteToken.address, USDC)) ||
      (isAddressEqual(pair.quoteToken.address, asset.token) && isAddressEqual(pair.baseToken.address, USDC))) &&
      Number.isFinite(pair.liquidity?.usd) && pair.liquidity!.usd! > 0).sort((a, b) => b.liquidity!.usd! - a.liquidity!.usd!);
    const highest = candidates[0];
    const match = Boolean(highest && asset.pool && isAddressEqual(highest.pairAddress, asset.pool));
    console.log(JSON.stringify({ observedAt: new Date().toISOString(), source: url, symbol: asset.symbol, candidates: candidates.map(pair => ({ pool: pair.pairAddress, liquidityUSD: pair.liquidity!.usd })), configuredHighest: match }));
    if (!match) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
