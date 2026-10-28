import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { z } from "zod";
import { cleanTranscript } from "@main/lib/clean-transcript";
import type { LocalModelConfig, LocalModelId } from "@main/lib/config";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import type { EngineStatus } from "@shared/types/engine";
import type { Result } from "@shared/types/result";

const MODEL_NAMES: Record<LocalModelId, string> = { hohe: "Hohe", buzzasr: "BuzzASR" };

export function amharicMessages(model: LocalModelId) {
  const name = MODEL_NAMES[model];
  return {
    notSetUp: `${name} isn't set up yet. Run npm run setup:amharic-model, then try again.`,
    failedToStart: `${name} couldn't start. Check that VoiceStudio is installed, then try again.`,
    failed: `${name} couldn't transcribe this recording. Try again.`,
    stopped: `${name} stopped unexpectedly. Try again.`,
    timedOut: `${name} took too long. Try a shorter recording.`,
  } as const;
}

export interface HelperTimeouts {
  /** Loading the weights (2–4 GB in memory); seconds normally, longer from a cold disk. */
  loadMs: number;
  /** Per request; a 30-minute recording decodes in a few minutes on Apple GPUs. */
  transcribeMs: number;
  /** The helper holds several GB while loaded, so it exits when unused. */
  idleMs: number;
}

const DEFAULT_TIMEOUTS: HelperTimeouts = {
  loadMs: 3 * 60_000,
  transcribeMs: 15 * 60_000,
  idleMs: 5 * 60_000,
};
const PYTHON_FLAGS = ["-I"];
const STDERR_TAIL_CHARS = 2000;
const STDERR_LOG_LINES = 5;

const helperMessageSchema = z.union([
  z.object({ ready: z.literal(true), device: z.string() }),
  z.object({ id: z.string(), text: z.string() }),
  z.object({ id: z.string().nullable(), error: z.string() }),
]);
type HelperMessage = z.infer<typeof helperMessageSchema>;
type HelperReply = Exclude<HelperMessage, { ready: true }>;

interface Helper {
  process: ChildProcessWithoutNullStreams;
  /** true once the model has loaded; false if the helper died or timed out first. */
  ready: Promise<boolean>;
}

interface PendingRequest {
  settle: (result: Result<string>) => void;
  timer: NodeJS.Timeout;
}

function failure(error: string): Result<string> {
  return { success: false, error };
}

function parseHelperMessage(line: string): HelperMessage | null {
  try {
    const parsed = helperMessageSchema.safeParse(JSON.parse(line));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Transcribes with a local Amharic model through electron/python/amharic_transcriber.py,
 * run on VoiceStudio's Python runtime. One helper process serves every
 * request, speaking one JSON object per line; it starts on the first request
 * (or `prepare`) and exits after `idleMs` without work.
 */
export class AmharicModelEngine implements TranscriptionEngine {
  private helper: Helper | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private idleTimer: NodeJS.Timeout | null = null;
  /** Requests between arriving and settling, including while the model loads. */
  private busy = 0;
  private readonly messages: ReturnType<typeof amharicMessages>;

  constructor(
    private readonly config: LocalModelConfig,
    private readonly timeouts: HelperTimeouts = DEFAULT_TIMEOUTS,
  ) {
    this.messages = amharicMessages(config.model);
  }

  async status(): Promise<EngineStatus> {
    return (await this.isSetUp()) ? { kind: "online" } : { kind: "offline", reason: this.messages.notSetUp };
  }

  async transcribe(audio: Uint8Array, fileName: string): Promise<Result<string>> {
    if (!(await this.isSetUp())) return failure(this.messages.notSetUp);
    this.busy += 1;
    this.cancelIdleShutdown();
    const dir = await mkdtemp(path.join(os.tmpdir(), "amharic-stt-"));
    try {
      const file = path.join(dir, path.basename(fileName));
      await writeFile(file, audio, { mode: 0o600 });
      const helper = this.helper ?? this.startHelper();
      if (!(await helper.ready)) return failure(this.messages.failedToStart);
      return await this.send(helper, file);
    } finally {
      this.busy -= 1;
      await rm(dir, { recursive: true, force: true });
      this.scheduleIdleShutdown();
    }
  }

  prepare(): void {
    void this.isSetUp().then((setUp) => {
      if (!setUp || this.helper) return;
      this.startHelper();
      this.scheduleIdleShutdown();
    });
  }

  release(): void {
    if (this.busy === 0) this.dispose();
  }

  dispose(): void {
    this.cancelIdleShutdown();
    this.helper?.process.kill();
    this.helper = null;
  }

  private async isSetUp(): Promise<boolean> {
    const checks = await Promise.allSettled([
      access(this.config.python, constants.X_OK),
      access(this.config.script, constants.R_OK),
      ...this.config.requiredFiles.map((file) => access(path.join(this.config.modelDir, file), constants.R_OK)),
    ]);
    return checks.every((check) => check.status === "fulfilled");
  }

  private startHelper(): Helper {
    const child = spawn(this.config.python, [...PYTHON_FLAGS, this.config.script, this.config.modelDir], {
      env: { ...process.env, HF_HUB_OFFLINE: "1", TOKENIZERS_PARALLELISM: "false" },
      stdio: "pipe",
    });
    let markReady: (loaded: boolean) => void = () => undefined;
    const helper: Helper = { process: child, ready: new Promise((resolve) => (markReady = resolve)) };
    this.helper = helper;

    const loadTimer = setTimeout(() => {
      markReady(false);
      child.kill();
    }, this.timeouts.loadMs);
    let stderrTail = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-STDERR_TAIL_CHARS);
    });
    // A write to a helper that just died must not crash the main process;
    // the exit handler reports the failure.
    child.stdin.on("error", () => undefined);
    createInterface({ input: child.stdout }).on("line", (line) => {
      const message = parseHelperMessage(line);
      if (!message) return;
      if ("ready" in message) {
        clearTimeout(loadTimer);
        markReady(true);
        return;
      }
      this.settle(message);
    });
    child.on("error", (error) => {
      console.error(`[${this.config.model}] helper failed to start:`, error.message);
      clearTimeout(loadTimer);
      markReady(false);
    });
    child.on("exit", (code, signal) => {
      clearTimeout(loadTimer);
      markReady(false);
      if (this.helper === helper) this.helper = null;
      if (code !== 0 && signal !== "SIGTERM") {
        const tail = stderrTail.trim().split("\n").slice(-STDERR_LOG_LINES).join(" | ");
        console.error(`[${this.config.model}] helper exited (${code ?? signal}): ${tail}`);
      }
      this.failAll(this.messages.stopped);
    });
    return helper;
  }

  private send(helper: Helper, file: string): Promise<Result<string>> {
    const id = randomUUID();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve(failure(this.messages.timedOut));
        helper.process.kill();
      }, this.timeouts.transcribeMs);
      this.pending.set(id, { settle: resolve, timer });
      helper.process.stdin.write(`${JSON.stringify({ id, path: file })}\n`);
    });
  }

  private settle(reply: HelperReply): void {
    const request = reply.id === null ? undefined : this.pending.get(reply.id);
    if (!request || reply.id === null) return;
    this.pending.delete(reply.id);
    clearTimeout(request.timer);
    if ("text" in reply) {
      request.settle({ success: true, data: cleanTranscript(reply.text) });
      return;
    }
    console.error(`[${this.config.model}] transcription failed:`, reply.error);
    request.settle(failure(this.messages.failed));
  }

  private failAll(message: string): void {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.settle(failure(message));
    }
    this.pending.clear();
  }

  private scheduleIdleShutdown(): void {
    this.cancelIdleShutdown();
    if (!this.helper || this.busy > 0) return;
    const helper = this.helper;
    this.idleTimer = setTimeout(() => {
      if (this.busy > 0 || this.helper !== helper) return;
      helper.process.kill();
      this.helper = null;
    }, this.timeouts.idleMs);
    this.idleTimer.unref();
  }

  private cancelIdleShutdown(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}
