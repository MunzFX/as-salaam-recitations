// Materialize the approved films for same-origin hosting during every build.
// Keep large binaries outside Git, while pinning their exact bytes in source.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = JSON.parse(await readFile(resolve(app, "cinematic-assets.json"), "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
let next = 0;
async function worker() {
  while (next < assets.length) {
    const asset = assets[next++];
    if (!/^assets\/world\/journey-hq-\d{2}(-mobile)?\.mp4$/.test(asset.path)) {
      throw new Error("Unexpected cinematic asset path");
    }
    const url = new URL(asset.url);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".cloudfront.net")) {
      throw new Error("Unexpected cinematic asset host");
    }
    const destination = resolve(app, "public", asset.path);
    const existing = await readFile(destination).catch(() => null);
    if (existing && hash(existing) === asset.sha256) continue;
    const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok) throw new Error(`Film download failed: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== asset.sha256) throw new Error(`Film checksum mismatch: ${asset.path}`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    console.log(`Prepared ${asset.path}`);
  }
}
await Promise.all([worker(), worker()]);
