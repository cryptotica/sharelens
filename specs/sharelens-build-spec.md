# ShareLens Build Spec Snapshot

Source: `C:/Users/timat/AppData/Local/hermes/attachments/sharelens-build-spec.md`
Retrieved: 2026-09-07

The attached spec is the source of truth for the requested P0/P1 scope, formulas, UI, and acceptance checklist. It is preserved outside the repo; this file records the source pointer rather than duplicating 444 lines.

## Review amendments
1. **Blocker:** replace source USDC address `0x833589fCD6eDb6E08f4c7C32D4f79b54bdA66913` with verified Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
2. Pool addresses are volatile observations, not permanent truth. Discover by token address + Aerodrome + USDC, select highest usable liquidity, and record token0/token1/fee before freezing config.
3. P0 is strictly read-only. Do not add wallet, geo, approvals, or swap until P0 live data and formula checks are green.
4. Treat country detection as a UI risk signal only; it is not a compliance/KYC control. Fail closed for trading when unavailable.
5. Base docs state B20 tokenized stocks are precompiles with no per-asset bytecode; Basescan links can be token/address links, but do not promise verified source code.
6. Add a visible `data as of`/staleness explanation and source links because pool and oracle values are time-sensitive.
