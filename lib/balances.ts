import { erc20Abi, type Address } from "viem";
import { b20Abi } from "./b20";
import { client } from "./client";
import { CHAIN_ID, USDC, type Token } from "./tokens";

export async function readBalances(asset: Token, account: Address) {
  if (await client.getChainId() !== CHAIN_ID) throw new Error("Balance RPC is not Base mainnet.");
  const block = await client.getBlock();
  const contract = { address: asset.token, blockNumber: block.number };
  const raw = await client.readContract({ ...contract, abi: erc20Abi, functionName: "balanceOf", args: [account] });
  const scaled = await client.readContract({ ...contract, abi: b20Abi, functionName: "scaledBalanceOf", args: [account] });
  const decimals = await client.readContract({ ...contract, abi: erc20Abi, functionName: "decimals" });
  const usdc = await client.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [account], blockNumber: block.number });
  const usdcDecimals = await client.readContract({ address: USDC, abi: erc20Abi, functionName: "decimals", blockNumber: block.number });
  if (usdcDecimals !== 6) throw new Error("Unexpected USDC precision.");
  return { raw, scaled, decimals, usdc, block: block.number, observedAt: Date.now() };
}
