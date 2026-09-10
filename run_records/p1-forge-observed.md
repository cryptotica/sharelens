# Forge P1 Observed Evidence

Date: 2026-09-08. Outcome: **working local artifact implemented; automated checks passed; production execution intentionally blocked; human browser review pending**. This is observed implementation evidence, not a prepared-only handoff and not a claim of a mainnet swap.

## Authority and Session

- Classification: `build_code`, high risk; owner Forge; reviewer Hermy.
- Handoff: `contracts/p1-forge.md`; startup and Standards Context recorded in `run_records/p1-forge-intake.md`.
- Worker: OpenCode, `openai/gpt-6-astra`, synchronous in this conversation. No delegated agents or model changes. A session identifier / OAuth account identifier was not exposed or queried; none is invented here.
- Workspace: `D:/Builder_System/worktrees/sharelens-p1/control_room/projects/product_experiments/sharelens`.
- All manual edits confined to this project. Initial and later `git status --short` both reported `?? ./`: the project was already untracked in the parent worktree. No staging, commit, push, deployment or transaction occurred. Existing Brain, source specs, prior runs and handoff notes were preserved.
- Implementation used an initial pass plus synchronous safety hardening, within the 60-minute recovery budget. No failed build/test recovery cycle was needed. The official missing pool-interface URL was corrected after one 404.
- No secrets, private keys, wallet account files or environment files were read. Only public RPC and public documentation/discovery endpoints were used. Test wallet addresses and transaction hashes exist only in test fixtures.

## Implemented Scope

- Original blue retro-console design: navy scan-grid canvas, layered lavender/cool-blue beveled chassis, blue window title strip, original geometric pixel lens SVG, selected inventory rows, tiny cyan power LED, dark numeric instruments, tactile controls, separate manual Buy Station. Existing P0 source/freshness/disclaimer information remains.
- Injected EIP-1193 connect, explicit Base switch, account/chain/disconnect event handling and local disconnect. No automatic account access or persisted connection. Stale asynchronous wallet reads and quote contexts are invalidated. Disconnect does not claim wallet permission revocation.
- Live selected-token `balanceOf` and `scaledBalanceOf`, token decimals and USDC `balanceOf`, using a single block per balance snapshot. Exact base-unit detail is available; no disconnected/loading placeholder balance is represented as zero. Balance refresh every 30 seconds.
- User-entered exact-input USDC quote panel, default editable `0.50%` slippage (strict `0.01%` to `5.00%`), bigint amounts/minimum output, actual Aerodrome Quoter result and B20 helper-based share conversion. No spot substitute. Quotes expire after 60 seconds and invalidate on account/chain/revision/asset/input changes.
- Official deployment lookup, pool factory/getPool check, router/quoter bytecode and factory binding, token order/tick spacing and pool-state verification before quotes. Discovery recheck confirms configured deepest reported pools at the recorded time.
- Separate exact-approval and exact-input swap implementations with real viem simulation calls, receipt tracking and Basescan links. Full fresh geo, oracle, pool, executable price, wallet, chain and quote revalidation before each signing step and after approval. No auto-swap after approval. Nonzero different/unlimited allowances are rejected; existing allowance must be revoked through the wallet first.
- Hash is pending, not success. Rejection/revert/timeout/cancelled or changed replacement failures are surfaced. Approval-confirmed/following-gate-failed state warns that exact allowance may remain. Context is checked again at actual `eth_sendTransaction` / `wallet_sendTransaction` provider boundaries.
- Server-side fail-closed geo route with no country bypass, no trusted-host assumption from arbitrary headers, and no cache. Read-only Lens/Guard/balances/quotes remain usable when execution is blocked.

## Exact Blockers and Skipped Scope

**Buy execution is disabled on this host:** `Country unknown: no trusted host geo source is configured. Trading is unavailable on this host.` There is no approved deployment/proxy trust boundary. `/api/geo` always returns `country: null`, `allowed: false`, `source: unconfigured`; spoofed country, host, Vercel-looking headers, cookies and query values cannot enable execution. No environment toggle or client self-certification was added.

Quote/router deployment support was established through official source research and public reads. That does not establish funded-account transfer-policy eligibility or a successful swap. Actual wallet consent UI, actual approval/swap simulation for a funded user, actual signatures and mainnet receipts were **not run**. No user wallet was connected during this run. `scaledBalanceOf` live probes below use public pool addresses, explicitly not user balances.

Builder attribution is unconfigured and visibly unclaimed. No genuine code was supplied. No attributed or unattributed transaction was sent. Before any future execution-enabled release, human review must establish trustworthy hosting/geo provenance and resolve/configure genuine builder attribution if required. Do not enable trading merely by changing a client boolean.

Desktop/mobile 390px stacking, focus treatment and reduced-motion styles are implemented, but **responsive, hydration, accessibility and visual acceptance are not marked passed**. Only HTTP/SSR and stylesheet delivery were observed. Hermy must perform real browser review, including wallet connect/reject/switch/disconnect and no-horizontal-overflow at 390px. No screenshots or browser session are claimed.

No deployment, Loom recording, publishing, transactions, money use, canon/standards promotion or P2 features. Pool liquidity ranking remains a recorded discovery snapshot, not continuous ranking.

## Commands and Exit Codes

| Command | Observed exit | Result |
|---|---:|---|
| `npm install --no-audit --no-fund` | 0 | Added 43 packages. npm warned esbuild 0.28.2 postinstall was blocked by existing allowScripts policy; no permission policy changed. Tests/build worked. |
| `npm test` | 0 | Final: 18 tests, 18 passed, 0 failed/skipped. Earlier incremental runs: 14, 15 and 16 passed. P0 four tests unchanged. |
| `npm run build` | 0 | All three build invocations passed. Final Next.js 16.3.4 webpack compile 4.9s, TypeScript 4.6s; `/` static, `/_not-found` static, `/api/geo` dynamic. |
| `npm run check:live` | 0 | All four B20/helper/oracle/pool live reads passed at Base block 51025521. All feeds fresh in this observation. |
| `npm run check:execution` | 0 | Initial block 51025204; final expanded probe block 51025666. All four factory/periphery matches and nonzero exact-input quoter outputs; live raw/scaled/USDC balance probes passed. |
| `npm run check:discovery` | 0 | Four configured pools were highest positive-liquidity Base/Aerodrome/exact-USDC-pair candidates reported by DexScreener. |
| `npm run check:preview` | 0 | Three invocations passed, including after final build. Local page and stylesheet HTTP 200; signing buttons disabled; geo spoof attempts blocked. Server stopped by script in finally. |
| `git status --short` | 0 | `?? ./` before and after; no commit/staging operation. |
| `git diff --check -- .` | 0 | No output. Limited value because project is untracked; build/tests are the source-code verification evidence. |

Tests explicitly cover US/unknown/untrusted/expired geo; spoofed headers/query/cookies; stale/paused/invalid oracle; exact premium 0.30%/1.00% thresholds and discount; missing pool; invalid/overflow/zero amounts; invalid/finite bounded slippage; bigint minOut; quote expiry; account/chain/asset/input/revision changes; wallet rejection, malformed responses and late connection cancellation; event listener cleanup; simulation/gate failures; receipt failure; hash-only pending state; exact calldata; fresh checks after approval including account changes and expiry; production local geo gate; account changes during viem's asynchronous pre-send chain check.

## Actual Execution Probe Output

Public endpoint: `https://base-rpc.publicnode.com`. Chain checked against 8453. No send RPC method used in this script.

```text
Read-only Slipstream verification; Base block 51025666; timestamp 1788840679
{"token":"0xb20000000000000000000078ee7ce2fE4908108C","pool":"0x853F5f1B92b16714Fe6CDA67CAad0856B83C7ab9","token0":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","token1":"0xb20000000000000000000078ee7ce2fE4908108C","tickSpacing":10,"fee":500,"deployment":{"name":"Gauges V3","factory":"0xf8f2eB4940CFE7d13603DDDD87f123820Fc061Ef","quoter":"0x514c8B5f54112481E28028F1166Bd78501089259","router":"0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F"},"factoryGetPoolMatch":true,"peripheryFactoryMatch":true}
{"symbol":"NVDAc","inputUSDC":"1.000000","amountOutBaseUnits":"429058","gasEstimate":"215182","callOnly":true}
{"symbol":"NVDAc","balanceProbeAccount":"0x853F5f1B92b16714Fe6CDA67CAad0856B83C7ab9","probeIsPoolNotUserWallet":true,"raw":"285845043654","scaledBalanceOf":"285845043654","decimals":8,"usdcBaseUnits":"1651227230351","balanceBlock":"51025668"}
{"token":"0xb200000000000000000000C2e324d24d7eEcd1fb","pool":"0xA3b1E3f9747065e2073722Ff4c9027d3eA4994F0","token0":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","token1":"0xb200000000000000000000C2e324d24d7eEcd1fb","tickSpacing":10,"fee":500,"deployment":{"name":"Gauges V3","factory":"0xf8f2eB4940CFE7d13603DDDD87f123820Fc061Ef","quoter":"0x514c8B5f54112481E28028F1166Bd78501089259","router":"0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F"},"factoryGetPoolMatch":true,"peripheryFactoryMatch":true}
{"symbol":"AAPLc","inputUSDC":"1.000000","amountOutBaseUnits":"312943","gasEstimate":"215271","callOnly":true}
{"symbol":"AAPLc","balanceProbeAccount":"0xA3b1E3f9747065e2073722Ff4c9027d3eA4994F0","probeIsPoolNotUserWallet":true,"raw":"256746562189","scaledBalanceOf":"256746562189","decimals":8,"usdcBaseUnits":"622574084756","balanceBlock":"51025671"}
{"token":"0xb2000000000000000000008bC8786B856E61707C","pool":"0xEAF57753BC382E0324a1D43F72E7027705a2273E","token0":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","token1":"0xb2000000000000000000008bC8786B856E61707C","tickSpacing":10,"fee":500,"deployment":{"name":"Gauges V3","factory":"0xf8f2eB4940CFE7d13603DDDD87f123820Fc061Ef","quoter":"0x514c8B5f54112481E28028F1166Bd78501089259","router":"0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F"},"factoryGetPoolMatch":true,"peripheryFactoryMatch":true}
{"symbol":"METAc","inputUSDC":"1.000000","amountOutBaseUnits":"163025","gasEstimate":"215312","callOnly":true}
{"symbol":"METAc","balanceProbeAccount":"0xEAF57753BC382E0324a1D43F72E7027705a2273E","probeIsPoolNotUserWallet":true,"raw":"103950297692","scaledBalanceOf":"103950297692","decimals":8,"usdcBaseUnits":"592210851821","balanceBlock":"51025673"}
{"token":"0xb2000000000000000000002D0BA3164cc74f58B7","pool":"0xB1987CAD1682841b4b641d50E520777eC5Ab5542","token0":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913","token1":"0xb2000000000000000000002D0BA3164cc74f58B7","tickSpacing":10,"fee":500,"deployment":{"name":"Gauges V3","factory":"0xf8f2eB4940CFE7d13603DDDD87f123820Fc061Ef","quoter":"0x514c8B5f54112481E28028F1166Bd78501089259","router":"0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F"},"factoryGetPoolMatch":true,"peripheryFactoryMatch":true}
{"symbol":"GOOGLc","inputUSDC":"1.000000","amountOutBaseUnits":"295504","gasEstimate":"215546","callOnly":true}
{"symbol":"GOOGLc","balanceProbeAccount":"0xB1987CAD1682841b4b641d50E520777eC5Ab5542","probeIsPoolNotUserWallet":true,"raw":"229919418946","scaledBalanceOf":"229919418946","decimals":8,"usdcBaseUnits":"832489375534","balanceBlock":"51025676"}
No approval, signature or transaction was requested. A quote is not a swap receipt.
```

## P0 Live Observation

`npm run check:live`: block `51025521`, timestamp `1788840389`. All token decimals 8; multiplier and WAD both `1000000000000000000`; 1 raw whole token converted through the helper to 1 equivalent share. All pools token0 USDC, token1 selected B20, fee 500, tick spacing 10.

| Asset | Chainlink total-return reference | updatedAt | State | Aerodrome spot |
|---|---:|---:|---|---:|
| NVDAc | 232.07 | 1788827375 | fresh | 232.95141708115673 |
| AAPLc | 318.45 | 1788826639 | fresh | 319.3947743668222 |
| METAc | 612.24 | 1788826403 | fresh | 612.9484033448099 |
| GOOGLc | 337.57 | 1788826237 | fresh | 338.23538321019146 |

These observations differ from the prior P0 run's stale feeds; neither state is hardcoded. Financial observations are time-sensitive and are not current investment advice.

## Actual Route Metadata

Final production-preview smoke, local server started synchronously and stopped afterward:

```json
{"route":"http://127.0.0.1:3107/","status":200,"contentType":"text/html; charset=utf-8","stylesheetCount":1,"instrumentsRendered":true,"signingButtonsDisabled":true}
{"route":"/api/geo","attemptedCountry":"US","status":200,"cacheControl":"private, no-store, max-age=0","observed":{"country":null,"allowed":false,"source":"unconfigured","checkedAt":1788840973440,"reason":"Country unknown: no trusted host geo source is configured. Trading is unavailable on this host."}}
{"route":"/api/geo","attemptedCountry":"TH","status":200,"cacheControl":"private, no-store, max-age=0","observed":{"country":null,"allowed":false,"source":"unconfigured","checkedAt":1788840973456,"reason":"Country unknown: no trusted host geo source is configured. Trading is unavailable on this host."}}
```

This is not a browser visual/hydration test. There is no public deployment URL, connected user account or real transaction hash to report.

## Files and Reproduction

New source files: `app/wallet.tsx`, `app/buy-station.tsx`, `app/api/geo/route.ts`, `lib/wallet.ts`, `lib/balances.ts`, `lib/geo.ts`, `lib/slipstream.ts`, `lib/trade.ts`, `tests/p1-safety.test.ts`, `scripts/check-execution.ts`, `scripts/check-discovery.ts`, `scripts/check-preview.ts`.

New project evidence: `run_records/p1-forge-intake.md`, `research/p1-execution.md`, this file.

Updated source: `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `lib/client.ts`, `lib/oracle.ts`, `package.json`. Install/build-managed artifacts include `node_modules`, `.next` and potentially refreshed lock/type metadata; no dependency was added for wallets or design. Existing viem and P0 math were reused.

Run `npm run dev` for Hermy's interactive browser review, or `npm run build` then `npm start`. `npm run check:preview` runs its own short-lived loopback server on port 3107. `npm test` is deterministic and network-free. `npm run check:live`, `npm run check:execution` and `npm run check:discovery` are network-dependent public read-only checks.

## Source URLs

- https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/README.md
- https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/periphery/interfaces/IQuoterV2.sol
- https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/periphery/interfaces/ISwapRouter.sol
- https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/core/interfaces/ICLFactory.sol
- https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/core/interfaces/pool/ICLPoolConstants.sol
- https://raw.githubusercontent.com/aerodrome-finance/slipstream/main/contracts/periphery/base/PeripheryImmutableState.sol
- https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- https://eips.ethereum.org/EIPS/eip-1193
- https://eips.ethereum.org/EIPS/eip-3326
- https://vercel.com/docs/headers/request-headers#x-vercel-ip-country

Exact DexScreener URLs, liquidity observations, deployment generations and ABI distinctions are preserved in `research/p1-execution.md`.

Handoff to Hermy: review this working artifact and evidence; perform desktop/390px browser checks without signing or sending. Production trade enablement is a separate human-reviewed trust/configuration decision, not an automatic next step.
