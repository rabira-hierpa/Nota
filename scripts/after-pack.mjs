// electron-builder afterPack hook (before signing). Built-in Hohe needs ONNX
// Runtime's native binding for the target system; where onnxruntime-node has
// none (Intel Macs), the models and the runtime's JavaScript are dead weight:
// drop them.
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import builder from "electron-builder";

const { Arch } = builder;

export function afterPack(context) {
  const platform = context.electronPlatformName;
  const resources =
    platform === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");
  const binding = path.join(
    resources,
    "node_modules",
    "onnxruntime-node",
    "bin",
    "napi-v6",
    platform,
    Arch[context.arch],
    "onnxruntime_binding.node",
  );
  if (existsSync(binding)) return;
  console.log(`  • no ONNX Runtime for ${platform} ${Arch[context.arch]}: leaving built-in Hohe out`);
  for (const dir of ["models", "node_modules"]) rmSync(path.join(resources, dir), { recursive: true, force: true });
}
