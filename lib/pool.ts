import { erc20Abi, isAddressEqual, parseAbi } from "viem";
import { client } from "./client";
import { USDC, type Token } from "./tokens";

const poolAbi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
  "function tickSpacing() view returns (int24)",
  "function liquidity() view returns (uint128)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)",
]);

// Exact rational USDC per whole B20 token, including reversed token ordering.
export function poolRatio(sqrtPriceX96: bigint, tokenIs0: boolean, tokenDecimals: number, quoteDecimals: number) {
  if (sqrtPriceX96 <= 0n) throw new Error("Pool is not initialized.");
  const square = sqrtPriceX96 ** 2n;
  const q192 = 2n ** 192n;
  return {
    numerator: (tokenIs0 ? square : q192) * 10n ** BigInt(tokenDecimals),
    denominator: (tokenIs0 ? q192 : square) * 10n ** BigInt(quoteDecimals),
  };
}

export async function readPool(asset: Token, blockNumber: bigint) {
  if (!asset.pool) return null;
  const contract = { address: asset.pool, abi: poolAbi, blockNumber };
  const token0 = await client.readContract({ ...contract, functionName: "token0" });
  const token1 = await client.readContract({ ...contract, functionName: "token1" });
  const fee = await client.readContract({ ...contract, functionName: "fee" });
  const tickSpacing = await client.readContract({ ...contract, functionName: "tickSpacing" });
  const liquidity = await client.readContract({ ...contract, functionName: "liquidity" });
  const slot0 = await client.readContract({ ...contract, functionName: "slot0" });
  const tokenDecimals = await client.readContract({ address: asset.token, abi: erc20Abi, functionName: "decimals", blockNumber });
  const quoteDecimals = await client.readContract({ address: USDC, abi: erc20Abi, functionName: "decimals", blockNumber });
  const tokenIs0 = isAddressEqual(token0, asset.token);
  if (!(tokenIs0 && isAddressEqual(token1, USDC)) &&
      !(isAddressEqual(token1, asset.token) && isAddressEqual(token0, USDC))) {
    throw new Error("Pool token addresses do not match this B20 / USDC pair.");
  }
  if (liquidity === 0n) return null;
  if (!slot0[5] || fee >= 1_000_000 || tickSpacing <= 0) throw new Error("Pool metadata or state is invalid.");
  return { ...poolRatio(slot0[0], tokenIs0, tokenDecimals, quoteDecimals), token0, token1, fee, tickSpacing, liquidity };
}
