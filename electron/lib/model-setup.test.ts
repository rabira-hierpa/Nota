import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModelSetup, setupCommand } from "@main/lib/model-setup";
import type { SetupEvent } from "@shared/types/engine";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "nota-setup-"));
});

afterEach(() => rm(dir, { recursive: true, force: true }));

/** Writes a stand-in setup script; returns its folder, as ModelSetup expects. */
async function script(body: string): Promise<string> {
  await writeFile(path.join(dir, "setup-amharic-model.sh"), body);
  return dir;
}

function run(setup: ModelSetup, events: SetupEvent[]): Promise<void> {
  return new Promise((resolve) => {
    const started = setup.start("hohe");
    expect(started).toBe(true);
    const timer = setInterval(() => {
      if (events.some((event) => event.kind === "done")) {
        clearInterval(timer);
        resolve();
      }
    }, 10);
  });
}

describe("ModelSetup", () => {
  it("passes on each line of output, progress redraws included, then success", async () => {
    const events: SetupEvent[] = [];
    const file = await script('echo "model: $1 in $NOTA_DATA_DIR"; printf "10%%\\r50%%\\r100%%\\n"; echo oops >&2');
    await run(new ModelSetup(file, "/data", (event) => events.push(event)), events);

    expect(events).toEqual([
      { kind: "line", text: "model: hohe in /data" },
      { kind: "line", text: "10%" },
      { kind: "line", text: "50%" },
      { kind: "line", text: "100%" },
      { kind: "line", text: "oops" },
      { kind: "done", ok: true },
    ]);
  });

  it("reports failure, and runs one setup at a time", async () => {
    const events: SetupEvent[] = [];
    const setup = new ModelSetup(await script("sleep 0.2; exit 3"), "/data", (event) => events.push(event));
    const done = run(setup, events);

    expect(setup.start("buzzasr")).toBe(false);
    await done;
    expect(events.at(-1)).toEqual({ kind: "done", ok: false });
    expect(setup.isRunning()).toBe(false);
  });

  it("runs PowerShell on Windows and bash elsewhere", () => {
    expect(setupCommand("/r", "hohe", "win32")).toEqual({
      program: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join("/r", "setup-amharic-model.ps1"), "hohe"],
    });
    expect(setupCommand("/r", "buzzasr", "linux")).toEqual({
      program: "/bin/bash",
      args: [path.join("/r", "setup-amharic-model.sh"), "buzzasr"],
    });
  });
});
