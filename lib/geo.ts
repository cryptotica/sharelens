export type Geo = { country: string | null; allowed: boolean; source: string; checkedAt: number; reason: string };
export const TRUSTED_GEO_SOURCE = "cloudflare-request.cf";

type CloudflareRequest = Request & { cf?: { country?: unknown } };

// ponytail: trust only Worker-owned request.cf; never infer provenance from
// client-controlled headers, query strings, cookies, Host or localStorage.
export function readGeo(request?: Request): Geo {
  const country = (request as CloudflareRequest | undefined)?.cf?.country;
  if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country)) {
    return { country: null, allowed: false, source: "unconfigured", checkedAt: Date.now(), reason: "Country unknown: no trusted Cloudflare geo context is configured. Trading is unavailable on this host." };
  }
  if (country === "US") {
    return { country, allowed: false, source: TRUSTED_GEO_SOURCE, checkedAt: Date.now(), reason: "Trading is unavailable in the United States." };
  }
  return { country, allowed: true, source: TRUSTED_GEO_SOURCE, checkedAt: Date.now(), reason: "Country accepted by the trusted Cloudflare geo context." };
}

export function assertGeo(geo: Geo, now: number) {
  if (!Number.isFinite(geo.checkedAt) || geo.checkedAt > now || now - geo.checkedAt > 30_000) throw new Error("Geo check expired.");
  if (!geo.country || geo.country === "US" || !geo.allowed || geo.source !== TRUSTED_GEO_SOURCE) throw new Error(geo.reason || "US or unknown country: trading blocked.");
}
