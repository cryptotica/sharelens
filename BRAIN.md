# ShareLens Brain

## Identity
- Project: ShareLens
- Parent: Product Experiments
- Purpose: one-screen decision aid for Coinbase Tokenized Stocks on Base.
- Status: P0 verified; P1 wallet/quotes and redesign locally verified, production trading blocked.
- Owner: พี่แมว
- Primary worker: Forge; Atlas routes; Hermy verifies.

## Product thesis
Users need two answers before interacting: (1) how many underlying shares their B20 balance represents, and (2) whether the Aerodrome USDC pool price is above/below the Chainlink total-return reference.

## Boundaries
- Base mainnet only, chain `8453`.
- Non-US eligible users only for any trade action; no KYC claim, no broker/onramp/agent positioning.
- Read-only P0 is the release gate. Swap is a stretch path and must never block the demo.
- Token identity is by address, never ticker.
- No 0x/1inch pricing or swap routing.
- No secrets in repo; public RPC only unless explicitly approved.

## Known research corrections
- Spec USDC address is incorrect. Verified Aerodrome/DexScreener quote address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- Official Base docs confirm B20 multiplier is WAD-scaled, `scaledBalanceOf`/conversion helpers exist, and Chainlink tokenized-equity feeds are total-return and expose pause/staleness signals.
- Current observed highest-liquidity Aerodrome USDC pairs are recorded in `research/pool-discovery-20260907.md`; recheck at build time because liquidity changes.

## Acceptance gate
P0 must show four selectable assets, live multiplier conversion, Chainlink reference + updatedAt/stale state, Aerodrome pool price, premium thresholds, provenance labels, contract links, non-US disclaimer, loading/error/no-pool states, and mobile-readable Loom layout.

## Latest run
- `run_records/p1-local-verified.md`
- Forge OpenCode `openai/gpt-6-astra` implemented P1 wallet/balances, Aerodrome quotes and Base-blue retro console redesign; Hermy verified tests/build/live reads and desktop/mobile browser checks after integration.
- Trading remains disabled: trusted host geo is unconfigured; builder attribution and real-wallet/mainnet transaction acceptance remain unresolved. No deployment or spend performed.
