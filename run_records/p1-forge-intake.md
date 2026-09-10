# Forge P1 Intake

- Classification: `build_code`; risk high (financial display and potential wallet signing).
- Authority and handoff: `contracts/p1-forge.md`; Forge implements synchronously, Hermy reviews. No delegation, secrets, transactions, spending, commit, push or deployment. Edits confined to ShareLens.
- Loaded: canonical creator identity / USER / SOUL / MEMORY, project index, BRAIN, full source spec, corrections, latest P0 verified record, P0 code/tests and local Next.js guides.
- Standards Context: `development/coding`, approved `2026.08.11-pilot`; Ponytail full, reuse viem and bigint helpers.
- Knowledge lookup: BRAIN, local pool-discovery and prior run contain P0 evidence but no execution deployment/ABI verification. Contract reports no ShareLens/Slipstream hits in main knowledge. Narrow gap: official Aerodrome deployment generations, ABI, EIP-1193 wallet lifecycle and trustworthy geo provenance.
- Implementation gate: verify factory/getPool and periphery before quote; fail closed on unavailable execution or geo. Never replace a quote with a spot estimate. No canon or standards promotion.
- Evidence contract: runnable deterministic tests, install/test/build/live checks with observed outputs; local route smoke where possible. Visual/responsive acceptance remains for Hermy's browser review, not inferred from CSS.
