# Cloudflare deployment plan

Status: prepared; not deployed.

## Decision
ShareLens should use **Cloudflare Workers with a Next.js adapter**, not a plain static Cloudflare Pages export. The app has a dynamic `/api/geo` route and the execution safety boundary depends on a server response. A static export would remove that route and leave the UI with a broken read path; it must not be treated as a production deployment.

Cloudflare's current Next.js guidance recommends `vinext` for new/compatible Next.js 16 applications. An OpenNext adapter is the conservative fallback when the existing Next.js app has compatibility gaps. Do not add either adapter until a bounded compatibility spike passes.

## Required pre-deploy spike

1. Keep the current Next.js app and trade/wallet logic unchanged.
2. Test the selected adapter in a temporary branch or disposable worktree.
3. Verify `/` and `/api/geo` in a local Cloudflare runtime.
4. Verify `/api/geo` still returns `country: null`, `allowed: false`, `source: unconfigured` when no trusted production geo source is configured.
5. Run `npm test`, `npm run build`, preview/live/execution/discovery checks, and browser smoke at 1440/390/320.
6. Confirm zero signing calls and no spoofed header/cookie/query can enable execution.
7. Only then add the adapter config to `main` and connect the GitHub repo in Cloudflare.

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
