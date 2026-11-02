// Run before electron-builder: Nota ships Hohe built in, so a release without
// the models (or with a half-built or stale copy) must not be made. Checks
// every file in models/manifest.json against its size and SHA-256.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const models = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "models");
const manifestPath = path.join(models, "manifest.json");

function fail(message) {
  console.error(`${message}\nBuild the speech models first: npm run build:speech`);
  process.exit(1);
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

if (!existsSync(manifestPath)) fail("models/manifest.json is missing.");
const { files } = JSON.parse(readFileSync(manifestPath, "utf8"));

for (const [name, { bytes, sha256: expected }] of Object.entries(files)) {
  const file = path.join(models, name);
  if (!existsSync(file)) fail(`models/${name} is missing.`);
  if (statSync(file).size !== bytes) fail(`models/${name} is not the size the manifest gives.`);
  if ((await sha256(file)) !== expected) fail(`models/${name} doesn't match the manifest.`);
}
console.log(`Speech models: ${Object.keys(files).length} files match models/manifest.json.`);
