import { erc20Abi, maxUint256, parseAbi, parseUnits } from "viem";
import { client } from "./client";
import type { Token } from "./tokens";

export const b20Abi = parseAbi([
  "function multiplier() view returns (uint256)",
  "function WAD_PRECISION() view returns (uint256)",
  "function toScaledBalance(uint256 raw) view returns (uint256)",
  "function toRawBalance(uint256 scaled) view returns (uint256)",
  "function scaledBalanceOf(address account) view returns (uint256)",
]);

export function parseAmount(value: string, decimals: number): bigint {
  if (!/^\d+(\.\d*)?$/.test(value) || (value.split(".")[1]?.length ?? 0) > decimals) {
    throw new Error(`Enter a non-negative amount with at most ${decimals} decimal places.`);
  }
  const raw = parseUnits(value, decimals);
  if (raw > maxUint256) throw new Error("Amount exceeds the B20 uint256 limit.");
  return raw;
}

export function rawToScaled(raw: bigint, multiplier: bigint, wad: bigint): bigint {
  if (raw < 0n || multiplier <= 0n || wad <= 0n) throw new Error("Invalid conversion inputs.");
  return raw * multiplier / wad;
}

export async function readB20(asset: Token, blockNumber: bigint) {
  const contract = { address: asset.token, abi: b20Abi, blockNumber };
  const symbol = await client.readContract({ address: asset.token, abi: erc20Abi, functionName: "symbol", blockNumber });
  const decimals = await client.readContract({ address: asset.token, abi: erc20Abi, functionName: "decimals", blockNumber });
  const multiplier = await client.readContract({ ...contract, functionName: "multiplier" });
  const wad = await client.readContract({ ...contract, functionName: "WAD_PRECISION" });
  if (multiplier <= 0n || wad <= 0n) throw new Error("Invalid B20 multiplier or precision.");
  return { symbol, decimals, multiplier, wad, blockNumber };
}

export async function readConversion(asset: Token, amount: string, data: Awaited<ReturnType<typeof readB20>>) {
  const raw = parseAmount(amount, data.decimals);
  const contract = { address: asset.token, abi: b20Abi, blockNumber: data.blockNumber };
  const scaled = await client.readContract({ ...contract, functionName: "toScaledBalance", args: [raw] });
  const roundTripRaw = await client.readContract({ ...contract, functionName: "toRawBalance", args: [scaled] });
  return { raw, scaled, roundTripRaw };
}
