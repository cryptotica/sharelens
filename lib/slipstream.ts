import { isAddressEqual, parseAbi } from "viem";
import { client } from "./client";
import { USDC, type Token } from "./tokens";

// Official deployment generations, not interchangeable routers. See research/p1-execution.md.
export const DEPLOYMENTS = [
  { name: "Initial", factory: "0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A", quoter: "0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0", router: "0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5" },
  { name: "Gauge Caps", factory: "0xaDe65c38CD4849aDBA595a4323a8C7DdfE89716a", quoter: "0x3d4C22254F86f64B7eC90ab8F7aeC1FBFD271c6C", router: "0xcbBb8035cAc7D4B3Ca7aBb74cF7BdF900215Ce0D" },
  { name: "Gauges V3", factory: "0xf8f2eB4940CFE7d13603DDDD87f123820Fc061Ef", quoter: "0x514c8B5f54112481E28028F1166Bd78501089259", router: "0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F" },
] as const;

export const factoryAbi = parseAbi([
  "function factory() view returns (address)",
  "function getPool(address tokenA, address tokenB, int24 tickSpacing) view returns (address)",
]);
export const quoterAbi = parseAbi([
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, int24 tickSpacing, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
]);
export const routerAbi = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, int24 tickSpacing, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
]);

export async function verifyDeployment(asset: Token, tickSpacing: number, blockNumber: bigint) {
  if (!asset.pool) throw new Error("No configured pool.");
  const factory = await client.readContract({ address: asset.pool, abi: factoryAbi, functionName: "factory", blockNumber });
  const deployment = DEPLOYMENTS.find(item => isAddressEqual(item.factory, factory));
  if (!deployment) throw new Error(`Unrecognized Slipstream factory: ${factory}`);
  const pool = await client.readContract({ address: factory, abi: factoryAbi, functionName: "getPool", args: [USDC, asset.token, tickSpacing], blockNumber });
  if (!isAddressEqual(pool, asset.pool)) throw new Error("Factory getPool does not match selected pool.");
  for (const address of [deployment.router, deployment.quoter]) {
    const code = await client.getCode({ address, blockNumber });
    if (!code || code === "0x") throw new Error(`Periphery has no bytecode: ${address}`);
    const peripheryFactory = await client.readContract({ address, abi: factoryAbi, functionName: "factory", blockNumber });
    if (!isAddressEqual(factory, peripheryFactory)) throw new Error("Periphery factory mismatch.");
  }
  return deployment;
}

export async function readExecutableQuote(asset: Token, amountIn: bigint, tickSpacing: number, blockNumber: bigint, side: "buy" | "sell" = "buy") {
  if (amountIn <= 0n) throw new Error("Quote requires positive exact input.");
  const deployment = await verifyDeployment(asset, tickSpacing, blockNumber);
  // eth_call only: the non-view quoter simulates pool.swap and reverts internally.
  const { result } = await client.simulateContract({
    address: deployment.quoter, abi: quoterAbi, functionName: "quoteExactInputSingle", blockNumber,
    args: [{ tokenIn: side === "buy" ? USDC : asset.token, tokenOut: side === "buy" ? asset.token : USDC, amountIn, tickSpacing, sqrtPriceLimitX96: 0n }],
  });
  if (result[0] <= 0n) throw new Error("Quoter returned no output.");
  return { deployment, amountOut: result[0], gasEstimate: result[3] };
}
