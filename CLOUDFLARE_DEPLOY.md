# Cloudflare deployment plan

Status: adapter verified locally; not deployed.

## Decision
ShareLens should use **Cloudflare Workers with a Next.js adapter**, not a plain static Cloudflare Pages export. The app has a dynamic `/api/geo` route and the execution safety boundary depends on a server response. A static export would remove that route and leave the UI with a broken read path; it must not be treated as a production deployment.

Cloudflare's current Next.js guidance recommends `vinext` for new/compatible Next.js 16 applications. The bounded spike passed with `vinext@1.0.0-beta.9`; the repository now contains its Cloudflare Workers/Vite configuration. OpenNext remains a fallback only if a future vinext regression appears.

## Completed compatibility checks

1. Keep the current Next.js app and trade/wallet logic unchanged.
2. `vinext check`: 83% compatible; only the expected ESM migration was required.
3. `npm run build:vinext`: passed; `/api/geo` remained an API route.
4. Local Cloudflare runtime: `/` and `/api/geo` returned HTTP 200.
5. Geo remained fail-closed: `country: null`, `allowed: false`, `source: unconfigured`.
6. Regression checks passed: `npm test` 20/20, preview, execution, and discovery.
7. The adapter config is now in `main` working tree; deployment is intentionally still pending.

## Trusted geo boundary implementation

`app/api/geo/route.ts` now passes the Worker `Request` into `readGeo()`. The route trusts only the platform-owned `request.cf.country` context, rejects missing/malformed/US values, and returns `source: cloudflare-request.cf` only for an eligible country. Headers, query parameters, cookies, Host, and local storage are not used. Local Next.js runs remain fail-closed; Wrangler's local emulator may provide a synthetic `request.cf` value, so production acceptance must be repeated after deployment.

## Cloudflare project settings after the spike

- Repository: `cryptotica/sharelens`
- Production branch: `main`
- Build command: adapter-specific command verified by the spike
- Build output: adapter-specific; do not guess `.next` or `out`
- Environment variables: none required for the current fail-closed geo policy
- Secrets: never commit; configure only through Cloudflare secrets after explicit approval

## Explicit non-goals

- No static export workaround for `/api/geo`.
- No client-side geo trust, header trust, cookie trust, query trust, auto-signing, or transaction bypass.
- No production deployment or Cloudflare account changes in this preparation step.
