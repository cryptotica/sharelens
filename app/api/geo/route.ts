import { readGeo } from "../../../lib/geo";

export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(readGeo(), { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
