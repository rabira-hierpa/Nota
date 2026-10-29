import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import path from "node:path";
import type { LocalModelId, SetupEvent } from "@shared/types/engine";

const MAX_LINE_LENGTH = 500;

/** The setup script for this system, in `dir`: PowerShell on Windows, bash elsewhere. */
export function setupCommand(dir: string, model: LocalModelId, platform: NodeJS.Platform = process.platform) {
  return platform === "win32"
    ? {
        program: "powershell.exe",
        args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(dir, "setup-amharic-model.ps1"), model],
      }
    : { program: "/bin/bash", args: [path.join(dir, "setup-amharic-model.sh"), model] };
}

/** pip, uv and the Hugging Face downloader redraw progress with \r; each redraw is a line. */
const LINE_BREAK = /[\r\n]+/;

/**
 * Runs the setup script (scripts/setup-amharic-model.sh, or the .ps1 on
 * Windows) for the setup guide, one at a time, passing each line of its
 * output on as it comes. The script is fixed (it
 * ships with the app) and the only argument is a validated model id.
 */
export class ModelSetup {
  private child: ChildProcess | null = null;

  constructor(
    /** The folder holding the setup scripts. */
    private readonly scriptDir: string,
    private readonly dataDir: string,
    private readonly emit: (event: SetupEvent) => void,
  ) {}

  isRunning(): boolean {
    return this.child !== null;
  }

  /** False if a setup is already running. */
  start(model: LocalModelId): boolean {
    if (this.child) return false;
    const { program, args } = setupCommand(this.scriptDir, model);
    const child = spawn(program, args, {
      env: { ...process.env, NOTA_DATA_DIR: this.dataDir, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.child = child;

    let pending = "";
    const forward = (chunk: Buffer) => {
      const parts = (pending + chunk.toString("utf8")).split(LINE_BREAK);
      pending = parts.pop() ?? "";
      for (const part of parts) this.line(part);
    };
    child.stdout?.on("data", forward);
    child.stderr?.on("data", forward);

    let finished = false;
    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      this.line(pending);
      if (this.child === child) this.child = null;
      this.emit({ kind: "done", ok });
    };
    child.on("error", (error) => {
      this.line(`Couldn't start the setup: ${error.message}`);
      finish(false);
    });
    child.on("exit", (code) => finish(code === 0));
    return true;
  }

  cancel(): void {
    this.child?.kill();
  }

  private line(text: string): void {
    const trimmed = text.trim();
    if (trimmed) this.emit({ kind: "line", text: trimmed.slice(0, MAX_LINE_LENGTH) });
  }
}
