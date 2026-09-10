# P0 Implementation Intake

- Classification: `build_code`; high risk financial display, recoverable local changes.
- Authority: user requests synchronous P0 implementation, tests and build; no commit or deployment.
- Handoff: `contracts/handoff.yaml`, restricted to read-only P0 by the current request.
- Context loaded: root AGENTS and canonical identity files, project index, BRAIN, full 444-line spec, preparation run, pool research, existing intake and handoff.
- Standards Context: `development/coding`, approved version `2026.08.11-pilot`.
- Knowledge lookup: sufficient local context; targeted official documentation and registry source verification only. No canon or standards promotion.
- Source correction: executable config uses the USDC address from BRAIN and the user, not the source spec typo.
- Plan: direct Base public RPC reads using viem; no wagmi because there is no wallet. Verify pool token order, fee, tick spacing and spot state onchain. No quote or transaction code.
- Evidence gate: actual files, unit tests, production build and synchronous live read smoke check. Human visual review remains required.
