# ShareLens — OpenDesign Manual Redesign Brief

## Work folder

**Open this exact local project folder in OpenDesign Desktop:**

`D:/Builder_System/Creator_OS/control_room/projects/product_experiments/sharelens`

Do not work in the parent `Creator_OS` folder and do not create a detached design-only project.

## Task

Redesign the existing ShareLens interface to closely follow the supplied retro pixel-art shop-window reference in composition, hierarchy, density, interaction pattern, and visual language—approximately 90% structurally—without copying logos, trademarks, artwork, or exact assets.

ShareLens is a Base trading terminal. Keep ShareLens identity and use a Base Blue palette with a pixel-art/retro terminal treatment.

## Required composition

- Dense stock/instrument list on the **left**.
- Main preview and stats panel in the **center**.
- **Buy / Sell Station** on the **right**.
- **Dividend Lens** and **Premium Guard** as lower HUD/status panels.
- Compact desktop layout: fit in one screen where practical and minimize scrolling.
- Responsive mobile layout: clean single-column stack without horizontal overflow.
- Preserve clear title bar, wallet/balance strip, dense table, preview panel, execution station, and lower status HUD.

## Guard and trading behavior

BUY button states must remain safety-bound:

- `ok`: green and enabled when all required gates pass.
- `warn`: yellow and enabled only where existing logic permits.
- `stop`: red and disabled.
- `stale`, `paused`, `unavailable`, or `locked`: muted and disabled.

Do not bypass or weaken any safety behavior. Do not auto-sign, spend funds, submit real trades, or fabricate successful execution. Users must explicitly approve transactions through the injected wallet/Base Account.

Preserve fail-closed behavior for trusted geo and Builder Attribution. Do not change trade calldata, quote validation, wallet boundaries, or market-read logic as part of the visual redesign.

## UI constraints

- No Copy contract button.
- Keep Verify addresses compact/collapsed beneath instrument names.
- Interactive controls must retain at least 44px touch targets.
- Preserve accessible labels, disabled states, focus states, and useful status text.
- Do not introduce a new UI framework or dependency.
- Reuse existing components and styles where possible.

## Allowed files to inspect/edit first

Read and modify only these files unless a small directly-related change is strictly required:

- `app/page.tsx`
- `app/globals.css`
- `app/buy-station.tsx`
- `lib/trade.ts` (read-only unless a safety-preserving UI integration fix is unavoidable)
- `lib/wallet.ts` (read-only unless a safety-preserving UI integration fix is unavoidable)
- `lib/geo.ts` (read-only)
- `package.json` (read-only)

Do not scan or read outside this project folder. Do not scan or modify:

- Parent `Creator_OS` tree
- `node_modules/`
- `.next/`
- `.git/`
- Credentials, `.env`, OAuth tokens, API keys, passwords, or private keys

Avoid broad recursive search. Inspect the listed files directly, then make the smallest necessary UI/CSS changes.

## Verification after editing

Run only these project-local checks from the work folder:

```bash
npm test
npm run build
npm run check:preview
npm run check:live
npm run check:execution
npm run check:discovery
git diff --check
```

Do not claim completion unless the changed files and check results are visible. If a check fails, report the exact failure and do not fabricate success.

## Manual OpenDesign instructions

1. Open OpenDesign Desktop manually.
2. Open/select the exact **Work folder** above, if the app asks for a project folder.
3. Open this brief file and paste its contents into the design brief/task field, or use the app's file import/attachment control if it visibly supports Markdown.
4. Attach the supplied pixel-art reference image manually if needed.
5. Confirm the selected provider/model in the OpenDesign UI before starting. Do not select OpenRouter. Use the configured OpenAI-through-Hermes route if the UI exposes it.
6. Start the redesign only after checking the target folder and scope.
7. After OpenDesign finishes, verify the actual files and run the checks above outside OpenDesign.

## Completion criteria

The task is complete only when:

- The ShareLens files in the exact work folder contain the intended redesign.
- Existing wallet/trade/safety behavior is preserved.
- The interface visibly follows the requested retro shop-window composition.
- The listed checks pass, or failures are explicitly reported.
- No credentials or secrets were accessed, copied, or included in the output.
