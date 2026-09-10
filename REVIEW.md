# ShareLens Review — 2026-09-07

## Verdict
Proceed, but only as a P0 read-only vertical slice first. The product idea is strong for the quest because it demonstrates a concrete B20-specific problem rather than another generic swap UI. The original plan is too optimistic about P1 and has one fatal config error.

## Must-fix before coding
- Correct Base USDC address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- Re-discover pools at build time and verify token ordering, pool type, fee/tick spacing, and router compatibility. Do not hard-freeze a DexScreener snapshot for executable swaps.
- Do not claim Basescan source verification for B20 assets; official docs describe them as precompiles. Link to token/address pages instead.
- Treat IP geolocation as a fail-closed trade signal, not a compliance control. If detection fails, hide trade actions.

## Revised build order
1. P0 shell and four address-bound token configs.
2. Onchain B20 reads and deterministic conversion tests.
3. Chainlink reads, pause/stale handling, and provenance labels.
4. Aerodrome read-only price and premium state.
5. Mobile/90-second Loom pass; capture before adding transaction risk.
6. Optional wallet balance display.
7. Optional swap only after live pool metadata, quote simulation, approvals, Builder Code attribution, and human approval.

## Explicit deferrals
Swap routing, geo implementation, bilingual UI, pool depth display, and all nonessential polish are deferred until P0 is green.

## Top risks
- Wrong/moving pool address or pool type.
- Oracle pause/staleness mistaken for a live price.
- Decimal/multiplier double-counting.
- Mainnet transaction failure or compliance misrepresentation.
- Loom readability on mobile.
