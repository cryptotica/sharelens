# P1 Execution Research

Retrieved 2026-09-08. Narrow missing-API research after the local BRAIN, full spec, corrections and P0 pool-discovery lookup. Official sources only for deployment/ABI; DexScreener is used only for the spec-approved liquidity discovery snapshot.

## Primary Sources

- Deployments: https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/README.md
- Quoter ABI: https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/periphery/interfaces/IQuoterV2.sol
- Router ABI: https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/periphery/interfaces/ISwapRouter.sol
- Factory ABI: https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/core/interfaces/ICLFactory.sol
- Pool interface: https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/core/interfaces/ICLPool.sol
- Pool factory/token-order/tick-spacing ABI: https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/core/interfaces/pool/ICLPoolConstants.sol
- Periphery factory binding: https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/periphery/base/PeripheryImmutableState.sol
- Base B20 helpers, policies, feeds: https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- Injected provider lifecycle: https://eips.ethereum.org/EIPS/eip-1193
- Explicit Base switch request: https://eips.ethereum.org/EIPS/eip-3326
- Host geo header semantics: https://vercel.com/docs/headers/request-headers#x-vercel-ip-country

An initial lookup of `contracts/core/interfaces/pool/ICLPoolImmutables.sol` returned HTTP 404. The official aggregate pool interface identified `ICLPoolConstants.sol`; that source was fetched successfully. No ABI was guessed from the missing file.

## Deployment Selection

The current official README lists Initial, Gauge Caps and Gauges V3. All three official factory/router/quoter tuples are recorded in `lib/slipstream.ts`; each selected pool is matched by its onchain `factory()`, not by an assumed default generation.

All four configured stock pools matched **Gauges V3** in actual public Base reads:

| Contract | Official address |
|---|---|
| Factory | `0xf8f2eB4940CFE7d13603DDDD87f123820Fc061Ef` |
| Quoter | `0x514c8B5f54112481E28028F1166Bd78501089259` |
| Router | `0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F` |

At block `51025666` (timestamp `1788840679`), all four pools returned USDC as token0, selected B20 as token1, tick spacing `10`, fee `500`. For each, factory `getPool(USDC, token, 10)` matched the configured pool. Router and quoter had bytecode and their `factory()` matched the pool factory. Full observations are in `run_records/p1-forge-observed.md`.

ABI distinctions: Slipstream uses `int24 tickSpacing`, not Uniswap's `uint24 fee`, in quote and swap input tuples. Quoter input order is tokenIn, tokenOut, amountIn, tickSpacing, sqrtPriceLimitX96. Router input order is tokenIn, tokenOut, tickSpacing, recipient, deadline, amountIn, amountOutMinimum, sqrtPriceLimitX96. Quoter is non-view and must be invoked through `eth_call` / viem `simulateContract`, never sent as a transaction.

## Quote Observations

Actual Quoter calls at block `51025666`, exact input `1,000,000` USDC base units (1 USDC):

| Asset | Output base units | Token decimals | Output tokens | Quoter gas estimate |
|---|---:|---:|---:|---:|
| NVDAc | 429058 | 8 | 0.00429058 | 215182 |
| AAPLc | 312943 | 8 | 0.00312943 | 215271 |
| METAc | 163025 | 8 | 0.00163025 | 215312 |
| GOOGLc | 295504 | 8 | 0.00295504 | 215546 |

These are historical read-only quoter outputs, not live offers, not transaction receipts, not funded-account router simulations, and not proof of transfer-policy eligibility. UI quotes are requested anew, context-bound and expire after 60 seconds. Spot price is never substituted.

## Liquidity Recheck

`npm run check:discovery` on 2026-09-08 at 04:11:19-20 UTC filtered Base / Aerodrome / exact token-address pair with USDC and positive finite liquidity. Every configured pool was still the highest-liquidity reported candidate:

| Asset | Configured pool liquidity USD | Other candidate liquidity USD |
|---|---:|---|
| NVDAc | 2,317,108.95 | 447.46; 0.01 |
| AAPLc | 1,442,589.82 | 6.53 |
| METAc | 1,229,523.54 | none returned |
| GOOGLc | 1,610,157.16 | none returned |

Sources:

- https://api.dexscreener.com/latest/dex/tokens/0xb20000000000000000000078ee7ce2fE4908108C
- https://api.dexscreener.com/latest/dex/tokens/0xb200000000000000000000C2e324d24d7eEcd1fb
- https://api.dexscreener.com/latest/dex/tokens/0xb2000000000000000000008bC8786B856E61707C
- https://api.dexscreener.com/latest/dex/tokens/0xb2000000000000000000002D0BA3164cc74f58B7

This is a discovery snapshot, not continuous ranking. Re-run discovery before enabling trading or release. No 0x / 1inch integration.

## Geo and Attribution Blocker

Vercel documents `x-vercel-ip-country` but an arbitrary local or self-hosted server cannot authenticate a request merely from `Host`, `x-vercel-id` or a country header. There is no approved deployment/proxy trust boundary in this worktree. `GET /api/geo` therefore always returns unknown / disallowed / source unconfigured with `private, no-store`. It deliberately ignores supplied headers, cookies and query values. There is no environment switch, client toggle or self-certified bypass.

Trading is explicitly disabled on this host. A reviewed host trust integration is necessary before changing that policy. Country detection would still be only a coarse risk signal, not KYC or proof of eligible jurisdiction.

No genuine builder code was supplied or configured. No attribution was invented or claimed, and no transaction was sent. Resolve whether attribution is required and configure a genuine code if required before any future execution-enabled release. This run does not promote a deployment or attribution policy.

## Execution Boundaries

Wallet connect requests account exposure only. Disconnect is local session invalidation, not permission revocation. Account/chain/disconnect events immediately invalidate prior context; reconnect does not restore persisted sessions.

Approval and swap are separate user actions with explicit amounts. Approval refuses existing nonzero allowances; swap requires allowance equal to the exact input. A different allowance must be revoked through the wallet first. Approval and swap use real viem simulations, then fresh geo/oracle/pool/account/chain/quote validation before signing. Approval receipt triggers fresh revalidation again. Quotes, selected input/asset and wallet revisions must still match at the actual provider send boundary.

Receipt rejection, revert, timeout and cancelled/different replacements are errors. Hash alone is pending. Repriced identical transactions may use the replacement receipt. Successful approval followed by a failed gate reports the confirmed approval and warns that the exact allowance may remain. No automatic swap follows approval.

These paths are deterministically tested with explicitly test-only providers. Production geo policy blocks them before any wallet signing request. No mainnet approval/swap was authorized or executed in this run.
