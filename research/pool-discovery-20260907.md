# ShareLens Pool Discovery — 2026-09-07

## Method
Read-only request to DexScreener API: `https://api.dexscreener.com/latest/dex/tokens/{token}`. Filtered `dexId == aerodrome`, quote symbol `USDC`, then selected the highest observed `liquidity.usd` per token. This is a volatile snapshot and must be rechecked immediately before build/deploy.

## Verified observed candidates

| Symbol | Token | Pool | Liquidity USD | Price USD | Quote token returned |
|---|---|---|---:|---:|---|
| NVDAc | `0xb20000000000000000000078ee7ce2fE4908108C` | `0x853F5f1B92b16714Fe6CDA67CAad0856B83C7ab9` | 2,461,264.21 | 232.13 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| AAPLc | `0xb200000000000000000000C2e324d24d7eEcd1fb` | `0xA3b1E3f9747065e2073722Ff4c9027d3eA4994F0` | 1,404,495.69 | 320.013 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| METAc | `0xb2000000000000000000008bC8786B856E61707C` | `0xEAF57753BC382E0324a1D43F72E7027705a2273E` | 1,336,192.06 | 613.16 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| GOOGLc | `0xb2000000000000000000002D0BA3164cc74f58B7` | `0xB1987CAD1682841b4b641d50E520777eC5Ab5542` | 1,616,986.28 | 338.80 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

## Caveat
The API response did not expose a reliable fee/tick-spacing field in this observation. Before putting a pool into executable swap config, query Aerodrome/chain state and verify pool type, token0, token1, fee/tick spacing, and router compatibility. P0 may display a read-only pool observation without implementing swap calldata.

## Sources
- https://api.dexscreener.com/latest/dex/tokens/0xb20000000000000000000078ee7ce2fE4908108C
- https://api.dexscreener.com/latest/dex/tokens/0xb200000000000000000000C2e324d24d7eEcd1fb
- https://api.dexscreener.com/latest/dex/tokens/0xb2000000000000000000008bC8786B856E61707C
- https://api.dexscreener.com/latest/dex/tokens/0xb2000000000000000000002D0BA3164cc74f58B7
