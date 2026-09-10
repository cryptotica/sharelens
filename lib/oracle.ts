import { parseAbi } from "viem";
import { client } from "./client";
import { REGISTRY, type Token } from "./tokens";

export const STALE_SECONDS = 36 * 60 * 60;
const oracleAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);
const registryAbi = parseAbi([
  "function getOracleParams(address token) view returns (uint256 multiplier, bool paused)",
]);

export function oracleState(updatedAt: number, now: number, paused: boolean) {
  if (!Number.isSafeInteger(updatedAt) || !Number.isSafeInteger(now) || updatedAt <= 0 || updatedAt > now) throw new Error("Invalid oracle timestamp.");
  if (paused) return "paused";
  return now - updatedAt > STALE_SECONDS ? "stale" : "fresh";
}

export async function readOracle(asset: Token, blockNumber: bigint) {
  const contract = { address: asset.feed, abi: oracleAbi, blockNumber };
  const decimals = await client.readContract({ ...contract, functionName: "decimals" });
  const round = await client.readContract({ ...contract, functionName: "latestRoundData" });
  const params = await client.readContract({ address: REGISTRY, abi: registryAbi, functionName: "getOracleParams", args: [asset.token], blockNumber });
  const [roundId, answer, , updatedAt, answeredInRound] = round;
  if (answer <= 0n || roundId === 0n || answeredInRound < roundId || params[0] <= 0n) {
    throw new Error("Invalid or incomplete Chainlink round / registry data.");
  }
  oracleState(Number(updatedAt), Math.floor(Date.now() / 1000), params[1]);
  // Total return already includes the multiplier. Never apply it again.
  return { answer, decimals, updatedAt: Number(updatedAt), paused: params[1] };
}
