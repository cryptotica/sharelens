# ShareLens redesign observed evidence

Date: 2026-09-08. State: implemented and locally verified for layout, read-only BUY/SELL quotes and deterministic execution safeguards. Production trading is locked, not accepted or enabled.

## Scope and handoff

Intake/handoff: `redesign-intake-20260908.md`. Work performed synchronously in the existing ShareLens directory with no agent delegation, commit, push, deployment, approval or transaction. Existing P1 knowledge and local Next.js 16.3.4 documentation were reused. The external spec attachment was not opened. No existing markdown knowledge notes were overwritten.

- Desktop stock list on the left, Buy Station on the right; Dividend Lens and Premium Guard below both.
- Native collapsed Verify details beneath each stock name contain token, Chainlink and Aerodrome pool links. Removed clipboard/copy UI and duplicate footer contract directory.
- BUY/SELL tabs with keyboard arrow/Home/End navigation, explicit pay/receive units, raw input balance and equivalent shares received/sold.
- SELL uses verified stock decimals and the same verified factory/quoter/router with stock -> USDC order. Exact allowance applies to the input token, not always USDC.
- Side changes clear input/quote; side, wallet account/revision, chain, token, amount and slippage are bound to quotes. Bigint amount/minimum output, simulation, post-approval revalidation and successful-receipt requirements retained.
- Unknown/untrusted geo remains fail closed. Independent builder-attribution blocker is displayed and checked during production signing revalidation, including when a test fixture supplies otherwise trusted geo. No invented builder code or configuration bypass added.
- Only the injected wallet provider can request user-approved transaction submission. No private keys, automated signing or approval-then-auto-swap added.

## Exact command results

| Command | Exit | Observed result |
| --- | ---: | --- |
| `npm test` | 0 | 20 passed; 0 failed/cancelled/skipped. Covers side/decimal binding, BUY/SELL calldata, independent builder lock and existing wallet/geo/market/simulation/receipt boundaries. |
| `npm run build` | 0 | Next.js 16.3.4 webpack production compile, TypeScript and prerender completed. `/` static; `/api/geo` dynamic. |
| `npm run check:live` | 0 | Base block 51032082; all four B20/oracle/pool reads passed and references fresh. |
| `npm run check:execution` | 0 | Base block 51032095; four factory/getPool/periphery matches; real read-only BUY and SELL quoter outputs and raw/scaled/USDC pool-account balance probes. |
| `npm run check:discovery` | 0 | 2026-09-08T07:46:11.427Z through 07:46:12.404Z; all four configured pools highest reported exact-USDC/Aerodrome liquidity candidates. |
| `uv run --with playwright python scripts/browser-redesign-check.py` | 0 | Fresh production server on 127.0.0.1:3012; sequential browser suites; server stopped in finally. |
| `browser-smoke.py --url http://127.0.0.1:3012 --output run_records/redesign-browser-20260908` (runner's Python) | 0 | Chromium/Edge at 1440x1000, 390x844, 320x740; HTTP 200, no document overflow or pageerror; real conversion rendered. |
| `browser-wallet-smoke.py --url http://127.0.0.1:3012 --output run_records/redesign-browser-20260908/wallet-smoke.json` (runner's Python) | 0 | Test-only injected provider, real BUY/SELL quotes; no-wallet/connect/wrong-chain/switch/balances/direction/slippage/input/account/disconnect/asset/forged-geo checks passed; zero send/sign calls. |
| `git diff --check -- .` | 0 | No output; limited coverage because the entire ShareLens project is untracked in its parent repository. |
| `git status --short -- .` | 0 | `?? ./`; no staging or Git writes performed. |

## Live execution observations

All four selected pools matched Gauges V3 factory `0xf8f2eB4940CFE7d13603DDDD87f123820Fc061Ef`, quoter `0x514c8B5f54112481E28028F1166Bd78501089259`, router `0x698Cb2b6dd822994581fEa6eA4Fc755d1363A92F`. Stock decimals 8, USDC decimals 6, tickSpacing 10, fee 500. Calls were simulations, not funded-account router execution.

| Asset | BUY output base units for 1 USDC | SELL output USDC base units for 1 stock token |
| --- | ---: | ---: |
| NVDAc | 431893 | 231307195 |
| AAPLc | 313595 | 318562406 |
| METAc | 163343 | 611594973 |
| GOOGLc | 296405 | 337038403 |

Quotes, references and liquidity are time-sensitive observations, not guarantees of future execution or deepest liquidity.

## Browser evidence and screenshots

- `redesign-browser-20260908/sharelens-1440.png`
- `redesign-browser-20260908/sharelens-390.png`
- `redesign-browser-20260908/sharelens-320.png`
- `redesign-browser-20260908/browser-smoke.json`: page text, buttons, layout coordinates, target heights and error/overflow results.
- `redesign-browser-20260908/wallet-smoke.json`: injected-provider call list, checks and actual fail-closed geo response.
- `redesign-browser-20260908/commands.json`: exact subprocess exits.
- `redesign-browser-20260908/server.log`: fresh production server startup output.

Browser assertions confirm stock-list right edge <= station left edge on desktop, analysis panels below station, and stacked stock/station layout on mobile. At 1440px, stock x=137, right=465; station x=483, bottom=1170.78125; analysis y=1262.78125. All measured controls have height >=44px. Verify sections start closed; Verify links can be expanded; copy buttons absent; SELL labels and keyboard return to BUY checked. Screenshots were generated, not opened as image attachments or claimed to have received independent visual review.

## Changed paths

- `app/page.tsx`
- `app/buy-station.tsx`
- `app/globals.css`
- `lib/trade.ts`
- `lib/slipstream.ts`
- `tests/p1-safety.test.ts`
- `scripts/check-execution.ts`
- `scripts/browser-smoke.py`
- `scripts/browser-wallet-smoke.py`
- `scripts/browser-redesign-check.py` (new)
- `run_records/redesign-intake-20260908.md` (new)
- `run_records/redesign-observed-20260908.md` (this record, new)
- `run_records/redesign-browser-20260908/` (seven generated evidence files listed above)

## Model/session provenance

Current runtime instructions declare model `openai/gpt-6-astra`, acting as OpenCode. No model switch or delegation performed. A current session ID, provider-side route export, OAuth metadata and independent model attestation are not exposed by the available in-project evidence. The previous P1 record's session `ses_f80dce2a9ffeaDb2c1bo5pxdCv` is historical and is not attributed to this run. Current model identity is runtime-declared, not independently route-verified.

## Blockers and limits

- Trusted production geo source is unconfigured; the real endpoint returns country=null, allowed=false, source=unconfigured even with forged TH/Vercel headers.
- Genuine approved builder attribution is unconfigured; production signing remains locked independently of geo.
- No real wallet-extension consent screen, funded-account approval/swap simulation, mainnet signature, transaction receipt or production deployment tested. Mock calldata/receipt tests and public quoter simulations are not real transaction acceptance.
- No outside-project source/attachment inspection. Initial unscoped Git status accidentally listed parent-workspace paths; no outside file content was opened and later Git commands used `-- .`.
- No independent current-session route export or visual screenshot review available within the requested constraints.
