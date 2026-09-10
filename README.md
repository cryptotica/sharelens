# ShareLens

A Base Builder Quest prototype: **Dividend Lens + Premium Guard** for Coinbase Tokenized Stocks.

## Build order
1. Freeze verified addresses and live pool discovery.
2. Ship P0 read-only vertical slice.
3. Test formulas and stale/pause/no-pool behavior.
4. Capture Loom before attempting any swap.
5. Add P1 only if P0 is stable and a human approves mainnet interaction testing.

## Workspace
- `BRAIN.md` — operational context
- `project.yaml` — project contract
- `specs/sharelens-build-spec.md` — source spec snapshot
- `contracts/task-intake.yaml` — intake classification
- `contracts/handoff.yaml` — Builder System handoff
- `research/` — external evidence and volatile pool observations
- `run_records/` — execution evidence

## Important
The source spec contained a wrong USDC address. Use the corrected address documented in `BRAIN.md` and the research record, not the source value.
