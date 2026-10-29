// `npm run setup:hohe` on any system: runs the setup script for this one
// (bash on macOS and Linux, PowerShell on Windows), passing the model through.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const model = process.argv[2] ?? "hohe";
const [program, args] =
  process.platform === "win32"
    ? ["powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(here, "setup-amharic-model.ps1"), model]]
    : ["bash", [path.join(here, "setup-amharic-model.sh"), model]];

const result = spawnSync(program, args, { stdio: "inherit" });
process.exit(result.status ?? 1);
