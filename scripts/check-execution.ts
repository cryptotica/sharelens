import { client } from "../lib/client";
import { readPool } from "../lib/pool";
import { readBalances } from "../lib/balances";
import { readExecutableQuote, verifyDeployment } from "../lib/slipstream";
import { CHAIN_ID, TOKENS } from "../lib/tokens";

async function main() {
  if (await client.getChainId() !== CHAIN_ID) throw new Error("Wrong chain");
  const block = await client.getBlock();
  console.log(`Read-only Slipstream verification; Base block ${block.number}; timestamp ${block.timestamp}`);
  for (const asset of TOKENS) {
    try {
      const pool = await readPool(asset, block.number);
      if (!pool) throw new Error("Missing active pool");
      const deployment = await verifyDeployment(asset, pool.tickSpacing, block.number);
      console.log(JSON.stringify({ token: asset.token, pool: asset.pool, token0: pool.token0, token1: pool.token1, tickSpacing: pool.tickSpacing, fee: pool.fee, deployment, factoryGetPoolMatch: true, peripheryFactoryMatch: true }));
      const quote = await readExecutableQuote(asset, 1_000_000n, pool.tickSpacing, block.number);
      console.log(JSON.stringify({ symbol: asset.symbol, inputUSDC: "1.000000", amountOutBaseUnits: quote.amountOut.toString(), gasEstimate: quote.gasEstimate.toString(), callOnly: true }));
      const balances = await readBalances(asset, asset.pool!);
      const sellQuote = await readExecutableQuote(asset, 10n ** BigInt(balances.decimals), pool.tickSpacing, block.number, "sell");
      console.log(JSON.stringify({ symbol: asset.symbol, side: "sell", inputStock: "1", amountOutUSDCBaseUnits: sellQuote.amountOut.toString(), gasEstimate: sellQuote.gasEstimate.toString(), callOnly: true }));
      console.log(JSON.stringify({ symbol: asset.symbol, balanceProbeAccount: asset.pool, probeIsPoolNotUserWallet: true, raw: balances.raw.toString(), scaledBalanceOf: balances.scaled.toString(), decimals: balances.decimals, usdcBaseUnits: balances.usdc.toString(), balanceBlock: balances.block.toString() }));
    } catch (error) {
      console.error(`${asset.symbol}: ${error && typeof error === "object" && "shortMessage" in error ? error.shortMessage : String(error)}`);
      process.exitCode = 1;
    }
  }
  console.log("No approval, signature or transaction was requested. A quote is not a swap receipt.");
}
main().catch(error => { console.error(error.shortMessage ?? error.message); process.exitCode = 1; });
