// Run before electron-builder: Nota ships Hohe built in, so a release without
// the models (or with a half-built or stale copy) must not be made. Checks
// every file in models/manifest.json against its size and SHA-256, that the
// models carry their NOTICE and the licence texts in licenses/models/, and
// that licenses/onnxruntime/ holds the notices of the ONNX Runtime Nota ships.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const models = path.join(root, "models");
const manifestPath = path.join(models, "manifest.json");
const modelLicenses = path.join(root, "licenses", "models");
const runtimeLicenses = path.join(root, "licenses", "onnxruntime");

const rewriteNotices = "Rewrite the models' notices: npm run build:speech -- --notices-only";
// The names build_speech_models.py and package.json's models filter treat as notices.
const isNotice = (name) => name === "NOTICE" || /^LICENSE-.*\.txt$/.test(name);

function fail(message, remedy = "Build the speech models first: npm run build:speech") {
  console.error(`${message}\n${remedy}`);
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
  const remedy = isNotice(name) ? rewriteNotices : undefined;
  if (!existsSync(file)) fail(`models/${name} is missing.`, remedy);
  if (statSync(file).size !== bytes) fail(`models/${name} is not the size the manifest gives.`, remedy);
  if ((await sha256(file)) !== expected) fail(`models/${name} doesn't match the manifest.`, remedy);
}

if (!("NOTICE" in files)) fail("models/NOTICE is missing.", rewriteNotices);
for (const name of readdirSync(modelLicenses).filter(isNotice)) {
  if (!(name in files)) fail(`models/${name} is missing.`, rewriteNotices);
  if (!readFileSync(path.join(models, name)).equals(readFileSync(path.join(modelLicenses, name)))) {
    fail(`models/${name} differs from licenses/models/${name}.`, rewriteNotices);
  }
}

const { version } = JSON.parse(readFileSync(path.join(root, "node_modules", "onnxruntime-node", "package.json"), "utf8"));
const fetchNotices = `Copy LICENSE and ThirdPartyNotices.txt from https://github.com/microsoft/onnxruntime/tree/v${version} into licenses/onnxruntime/ and write ${version} in its VERSION file.`;
for (const name of ["LICENSE", "ThirdPartyNotices.txt", "VERSION"]) {
  if (!existsSync(path.join(runtimeLicenses, name))) fail(`licenses/onnxruntime/${name} is missing.`, fetchNotices);
}
const noticed = readFileSync(path.join(runtimeLicenses, "VERSION"), "utf8").trim();
if (noticed !== version) {
  fail(`licenses/onnxruntime/ holds ONNX Runtime ${noticed}'s notices, but Nota ships ${version}.`, fetchNotices);
}

console.log(`Speech models: ${Object.keys(files).length} files match models/manifest.json, notices included.`);
