import { formatUnits } from "viem";
import { client } from "../lib/client";
import { readB20, readConversion, rawToScaled } from "../lib/b20";
import { readOracle, oracleState } from "../lib/oracle";
import { readPool } from "../lib/pool";
import { CHAIN_ID, TOKENS } from "../lib/tokens";

async function main() {
  if (await client.getChainId() !== CHAIN_ID) throw new Error("Wrong chain");
  const block = await client.getBlock();
  console.log(`Base block ${block.number}; timestamp ${block.timestamp}`);
  for (const asset of TOKENS) {
    const [b20, oracle, pool] = await Promise.all([readB20(asset, block.number), readOracle(asset, block.number), readPool(asset, block.number)]);
    const conversion = await readConversion(asset, "1", b20);
    if (conversion.scaled !== rawToScaled(conversion.raw, b20.multiplier, b20.wad)) throw new Error("Helper mismatch");
    if (!pool) throw new Error(`No active pool: ${asset.token}`);
    console.log(JSON.stringify({ token: asset.token, symbol: b20.symbol, decimals: b20.decimals, multiplier: b20.multiplier.toString(), wad: b20.wad.toString(), shares: formatUnits(conversion.scaled, b20.decimals), reference: formatUnits(oracle.answer, oracle.decimals), updatedAt: oracle.updatedAt, oracleState: oracleState(oracle.updatedAt, Math.floor(Date.now() / 1000), oracle.paused), pool: asset.pool, token0: pool.token0, token1: pool.token1, fee: pool.fee, tickSpacing: pool.tickSpacing, poolPrice: Number(pool.numerator) / Number(pool.denominator) }));
  }
}
main().catch(error => { console.error(error.shortMessage ?? error.message); process.exitCode = 1; });
