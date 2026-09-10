import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const port = 3107;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let ready = false;
let startupError = "";
server.stdout.on("data", chunk => { const text = String(chunk); process.stdout.write(text); if (text.includes("Ready")) ready = true; });
server.stderr.on("data", chunk => { startupError += String(chunk); process.stderr.write(chunk); });

async function main() {
  try {
    for (let attempt = 0; attempt < 100 && !ready; attempt++) {
      if (server.exitCode !== null) throw new Error(`Preview exited: ${server.exitCode}; ${startupError}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, "local server startup timed out");
    const response = await fetch(origin);
    assert.equal(response.status, 200);
    const html = await response.text();
    for (const text of ["ShareLens", "Dividend Lens", "Premium Guard", "Buy / Sell Station", "Connect wallet", "NON-US ONLY", "Safety interlock"]) assert.ok(html.includes(text), `${text} in SSR`);
    assert.ok(html.includes("1. Approve exact"), "approval action in SSR");
    assert.ok(html.includes("2. Swap to"), "swap action in SSR");
    const stylesheets = [...html.matchAll(/href="([^"]+\.css(?:\?[^"]*)?)"/g)].map(match => match[1]);
    assert.ok(stylesheets.length > 0);
    for (const stylesheet of stylesheets) assert.equal((await fetch(new URL(stylesheet, origin))).status, 200);
    console.log(JSON.stringify({ route: origin + "/", status: response.status, contentType: response.headers.get("content-type"), stylesheetCount: stylesheets.length, instrumentsRendered: true, signingButtonsDisabled: true }));
    for (const country of ["US", "TH"]) {
      const geoResponse = await fetch(`${origin}/api/geo?country=${country}`, { headers: { "x-vercel-ip-country": country, "x-vercel-id": "spoofed", "x-forwarded-host": "fake.vercel.app", cookie: `country=${country}` } });
      assert.equal(geoResponse.status, 200);
      const geo = await geoResponse.json();
      assert.equal(geo.allowed, false); assert.equal(geo.country, null);
      assert.match(geoResponse.headers.get("cache-control")!, /no-store/);
      console.log(JSON.stringify({ route: "/api/geo", attemptedCountry: country, status: geoResponse.status, cacheControl: geoResponse.headers.get("cache-control"), observed: geo }));
    }
    console.log("HTTP/SSR smoke only. No browser, responsive, hydration or visual acceptance claimed. No wallet or transaction connected.");
  } finally { server.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
