import { readGeo } from "../../../lib/geo";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return Response.json(readGeo(request), { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
