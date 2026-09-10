export type Geo = { country: string | null; allowed: boolean; source: string; checkedAt: number; reason: string };

// ponytail: no approved host/proxy trust boundary exists. Never infer provenance
// from Host, x-vercel-id, client country headers, query strings or localStorage.
export function readGeo(): Geo {
  return { country: null, allowed: false, source: "unconfigured", checkedAt: Date.now(), reason: "Country unknown: no trusted host geo source is configured. Trading is unavailable on this host." };
}

export function assertGeo(geo: Geo, now: number) {
  if (!Number.isFinite(geo.checkedAt) || geo.checkedAt > now || now - geo.checkedAt > 30_000) throw new Error("Geo check expired.");
  if (!geo.country || geo.country === "US" || !geo.allowed || geo.source !== "trusted-host") throw new Error(geo.reason || "US or unknown country: trading blocked.");
}
