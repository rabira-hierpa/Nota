// electron-builder afterPack hook (before signing). Built-in Hohe needs ONNX
// Runtime's native binding for the target system; where onnxruntime-node has
// none (Intel Macs), the models and the runtime's JavaScript are dead weight:
// drop them. Where it ships, it must carry its licences (checkLicences).
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import builder from "electron-builder";

const { Arch } = builder;

const manifestPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "models", "manifest.json");
// ONNX Runtime's Windows build also carries DirectML and the DirectX shader
// compiler. Nota's sessions run on the CPU and never load them, and they come
// with Microsoft terms of their own, so package.json leaves them out.
const UNSHIPPED = ["DirectML.dll", "dxcompiler.dll", "dxil.dll"];

export function afterPack(context) {
  const platform = context.electronPlatformName;
  const resources =
    platform === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");
  const runtime = path.join(resources, "node_modules", "onnxruntime-node");
  const native = path.join(runtime, "bin", "napi-v6", platform, Arch[context.arch]);
  if (existsSync(path.join(native, "onnxruntime_binding.node"))) {
    checkLicences(resources, runtime, native);
    return;
  }
  console.log(`  • no ONNX Runtime for ${platform} ${Arch[context.arch]}: leaving built-in Hohe out`);
  for (const dir of ["models", "node_modules"]) rmSync(path.join(resources, dir), { recursive: true, force: true });
}

/** Every file in models/manifest.json (NOTICE and the licence texts too), and ONNX Runtime's notices. */
function checkLicences(resources, runtime, native) {
  const { files } = JSON.parse(readFileSync(manifestPath, "utf8"));
  const missing = [
    ...Object.keys(files).map((name) => path.join(resources, "models", name)),
    path.join(runtime, "LICENSE"),
    path.join(runtime, "ThirdPartyNotices.txt"),
  ].filter((file) => !existsSync(file));
  if (missing.length > 0) {
    throw new Error(`The package lacks ${missing.map((file) => path.relative(resources, file)).join(", ")}.`);
  }
  const unshipped = UNSHIPPED.filter((name) => existsSync(path.join(native, name)));
  if (unshipped.length > 0) throw new Error(`The package carries ${unshipped.join(", ")}, which Nota leaves out.`);
}
