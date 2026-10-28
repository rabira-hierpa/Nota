import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AMHARIC_MESSAGES, AmharicModelEngine } from "@main/lib/amharic-model-engine";
import type { HelperTimeouts } from "@main/lib/amharic-model-engine";

// Stands in for `python -I amharic_transcriber.py <model_dir>`: same line
// protocol, behaviour picked by <model_dir>/mode (re-read on every request).
const FAKE_HELPER = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const modelDir = process.argv[4];
const mode = () => fs.readFileSync(path.join(modelDir, "mode"), "utf8").trim();
fs.appendFileSync(path.join(modelDir, "starts"), "x");
if (mode() === "never-ready") {
  setInterval(() => undefined, 1000);
} else {
  process.stdout.write(JSON.stringify({ ready: true, device: "cpu" }) + "\\n");
  readline.createInterface({ input: process.stdin }).on("line", (line) => {
    const request = JSON.parse(line);
    const current = mode();
    if (current === "crash") process.exit(3);
    if (current === "hang") return;
    const reply = current === "error"
      ? { id: request.id, error: "RuntimeError: boom in /private/secret/path" }
      : { id: request.id, text: " ሰላም  " + fs.statSync(request.path).size + "\\uFFFD " + request.path };
    process.stdout.write(JSON.stringify(reply) + "\\n");
  });
}
`;

const audio = new Uint8Array([1, 2, 3, 4]);
const quick: HelperTimeouts = { loadMs: 3000, transcribeMs: 3000, idleMs: 60_000 };

let dir: string;
let modelDir: string;
let engine: AmharicModelEngine;

async function setMode(mode: string): Promise<void> {
  await writeFile(path.join(modelDir, "mode"), mode);
}

async function helperStarts(): Promise<number> {
  return (await readFile(path.join(modelDir, "starts"), "utf8").catch(() => "")).length;
}

function makeEngine(timeouts: HelperTimeouts = quick): AmharicModelEngine {
  engine = new AmharicModelEngine(
    {
      python: path.join(dir, "fake-python"),
      script: path.join(dir, "amharic_transcriber.py"),
      modelDir,
    },
    timeouts,
  );
  return engine;
}

beforeEach(async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  dir = await mkdtemp(path.join(tmpdir(), "stt-amharic-"));
  modelDir = path.join(dir, "model");
  await mkdir(modelDir);
  await writeFile(path.join(modelDir, "model.safetensors"), "");
  await writeFile(path.join(modelDir, "generation_config.json"), "{}");
  await writeFile(path.join(dir, "fake-python"), FAKE_HELPER, { mode: 0o755 });
  await writeFile(path.join(dir, "amharic_transcriber.py"), "# the fake helper ignores this\n");
  await setMode("ok");
});

afterEach(async () => {
  engine?.dispose();
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe("AmharicModelEngine", () => {
  it("is ready once the model folder exists, and says how to set it up otherwise", async () => {
    expect(await makeEngine().status()).toEqual({ kind: "online", engine: "amharic-model" });

    await rm(path.join(modelDir, "model.safetensors"));
    expect(await engine.status()).toEqual({
      kind: "offline",
      engine: "amharic-model",
      reason: AMHARIC_MESSAGES.notSetUp,
    });
    expect(await engine.transcribe(audio, "a.wav")).toEqual({ success: false, error: AMHARIC_MESSAGES.notSetUp });
    expect(await helperStarts()).toBe(0);
  });

  it("transcribes through the helper, cleans the text and deletes the temporary WAV", async () => {
    const result = await makeEngine().transcribe(audio, "rec.wav");

    if (!result.success) throw new Error(result.error);
    const [word, size, tempFile] = result.data.split(" ");
    expect([word, size]).toEqual(["ሰላም", "4"]);
    expect(result.data).not.toContain(String.fromCodePoint(0xfffd));
    expect(path.basename(tempFile)).toBe("rec.wav");
    expect(existsSync(tempFile)).toBe(false);
  });

  it("keeps one helper for back-to-back recordings", async () => {
    makeEngine();
    await engine.transcribe(audio, "a.wav");
    await engine.transcribe(audio, "b.wav");
    expect(await helperStarts()).toBe(1);
  });

  it("keeps the helper's error detail out of the message", async () => {
    await setMode("error");
    expect(await makeEngine().transcribe(audio, "a.wav")).toEqual({ success: false, error: AMHARIC_MESSAGES.failed });
  });

  it("reports a crash, then starts a fresh helper next time", async () => {
    await setMode("crash");
    expect(await makeEngine().transcribe(audio, "a.wav")).toEqual({ success: false, error: AMHARIC_MESSAGES.stopped });

    await setMode("ok");
    expect((await engine.transcribe(audio, "a.wav")).success).toBe(true);
    expect(await helperStarts()).toBe(2);
  });

  it("gives up when the model never finishes loading", async () => {
    await setMode("never-ready");
    const result = await makeEngine({ ...quick, loadMs: 300 }).transcribe(audio, "a.wav");
    expect(result).toEqual({ success: false, error: AMHARIC_MESSAGES.failedToStart });
  });

  it("times out a transcription that never answers", async () => {
    await setMode("hang");
    const result = await makeEngine({ ...quick, transcribeMs: 300 }).transcribe(audio, "a.wav");
    expect(result).toEqual({ success: false, error: AMHARIC_MESSAGES.timedOut });
  });

  it("releases the model after it has been idle", async () => {
    makeEngine({ ...quick, idleMs: 200 });
    await engine.transcribe(audio, "a.wav");
    await new Promise((resolve) => setTimeout(resolve, 500));
    await engine.transcribe(audio, "b.wav");
    expect(await helperStarts()).toBe(2);
  });
});
