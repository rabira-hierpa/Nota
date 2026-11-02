import { randomUUID } from "node:crypto";
import { cleanTranscript } from "@main/lib/clean-transcript";
import type { TranscribeOptions, TranscriptionEngine } from "@main/lib/transcription-engine";
import { SAMPLE_RATE } from "@main/speech/wav";
import { workerReplySchema } from "@main/speech/worker-protocol";
import type { WorkerReply, WorkerRequest } from "@main/speech/worker-protocol";
import { amharicMessages, BUILT_IN_MESSAGES } from "@shared/messages";
import type { EngineStatus } from "@shared/types/engine";
import type { Result } from "@shared/types/result";

/** The speech worker as the engine sees it; main.ts makes one with utilityProcess.fork. */
export interface SpeechWorker {
  postMessage(message: WorkerRequest): void;
  onMessage(listener: (message: WorkerReply | null) => void): void;
  onExit(listener: (code: number) => void): void;
  kill(): void;
}

export type StartWorker = () => SpeechWorker;

export interface WorkerTimeouts {
  /** Reading 840 MB of weights; a few seconds, longer from a cold disk. */
  loadMs: number;
  /**
   * Per request, from when the worker starts it: this, plus `perAudioSecondMs`
   * for each second of audio. Hohe reads 2–4 times faster than real time on an
   * M1 Pro's CPU; the allowance covers machines four to eight times slower.
   */
  transcribeMs: number;
  perAudioSecondMs: number;
  /** The worker holds over a gigabyte while loaded, so it exits when unused. */
  idleMs: number;
}

const DEFAULT_TIMEOUTS: WorkerTimeouts = {
  loadMs: 2 * 60_000,
  transcribeMs: 2 * 60_000,
  perAudioSecondMs: 2_000,
  idleMs: 5 * 60_000,
};

/** 16-bit mono WAV: the header is too small to matter. */
const BYTES_PER_AUDIO_SECOND = SAMPLE_RATE * 2;

type TranscribeRequest = Extract<WorkerRequest, { type: "transcribe" }>;

interface QueuedRequest {
  message: TranscribeRequest;
  settle: (result: Result<string>) => void;
  timeoutMs: number;
  timer: NodeJS.Timeout | null;
}

interface Worker {
  process: SpeechWorker;
  /** true once Hohe has loaded; false if the worker died or timed out first. */
  ready: Promise<boolean>;
  /** Set when the engine stops it, so its exit isn't logged as a failure. */
  stopping: boolean;
  /**
   * Its requests, oldest first. The worker runs one at a time, so only the
   * first has been sent, and only its time counts against its timeout.
   */
  queue: QueuedRequest[];
}

const MESSAGES = { ...amharicMessages("hohe"), ...BUILT_IN_MESSAGES };

function failure(error: string): Result<string> {
  return { success: false, error };
}

/** Parses what the worker sends; anything else is null. */
export function parseWorkerReply(data: object | string | number | boolean | null | undefined): WorkerReply | null {
  const parsed = workerReplySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Hohe built into the app: 8-bit ONNX models run by the speech worker
 * (electron/speech/speech-worker.ts), no Python and nothing to download.
 * Mirrors AmharicModelEngine: one worker for every request, started on the
 * first (or `prepare`), gone after `idleMs` without work.
 */
export class BuiltInHoheEngine implements TranscriptionEngine {
  readonly builtIn = true;
  private worker: Worker | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private busy = 0;
  /** Set when the worker couldn't load Hohe, so the status says so until a load succeeds. */
  private broken = false;

  constructor(
    private readonly startWorker: StartWorker,
    private readonly timeouts: WorkerTimeouts = DEFAULT_TIMEOUTS,
  ) {}

  status(): Promise<EngineStatus> {
    return Promise.resolve(this.broken ? { kind: "offline", reason: MESSAGES.failedToStart } : { kind: "online" });
  }

  async transcribe(audio: Uint8Array, _fileName: string, options: TranscribeOptions = {}): Promise<Result<string>> {
    this.busy += 1;
    this.cancelIdleShutdown();
    try {
      const worker = this.worker ?? this.start();
      if (!(await worker.ready)) return failure(MESSAGES.failedToStart);
      return await this.send(worker, audio, options.punctuate ?? false);
    } finally {
      this.busy -= 1;
      this.scheduleIdleShutdown();
    }
  }

  prepare(): void {
    if (this.worker) return;
    this.start();
    this.scheduleIdleShutdown();
  }

  release(): void {
    if (this.busy === 0) this.dispose();
  }

  dispose(): void {
    this.cancelIdleShutdown();
    if (this.worker) this.stop(this.worker);
  }

  private stop(worker: Worker): void {
    worker.stopping = true;
    worker.process.kill();
    if (this.worker === worker) this.worker = null;
  }

  private start(): Worker {
    const child = this.startWorker();
    let markReady: (loaded: boolean) => void = () => undefined;
    const worker: Worker = {
      process: child,
      ready: new Promise((resolve) => (markReady = resolve)),
      stopping: false,
      queue: [],
    };
    this.worker = worker;
    let settled = false;
    const loaded = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(loadTimer);
      this.broken = !ok;
      markReady(ok);
      // A worker that couldn't load is no use; the next request starts afresh.
      if (!ok) this.stop(worker);
    };
    const loadTimer = setTimeout(() => {
      console.error("[hohe] the speech worker took too long to load");
      loaded(false);
    }, this.timeouts.loadMs);

    child.onMessage((message) => {
      // Whatever a worker sends once the engine has let it go is stale.
      if (!message || worker.stopping) return;
      if (message.type === "ready") loaded(true);
      else if (message.type === "error" && message.id === null) {
        console.error("[hohe] the speech worker couldn't load:", message.error);
        loaded(false);
      } else this.settle(worker, message);
    });
    child.onExit((code) => {
      clearTimeout(loadTimer);
      if (!worker.stopping) {
        console.error(`[hohe] the speech worker exited (${code})`);
        // Dying before Hohe loaded (a crash, or the system out of memory) is a failure to start.
        if (!settled) this.broken = true;
      }
      settled = true;
      markReady(false);
      if (this.worker === worker) this.worker = null;
      this.failAll(worker, MESSAGES.stopped);
    });
    child.postMessage({ type: "prepare" });
    return worker;
  }

  private send(worker: Worker, audio: Uint8Array, punctuate: boolean): Promise<Result<string>> {
    const seconds = audio.byteLength / BYTES_PER_AUDIO_SECOND;
    return new Promise((resolve) => {
      worker.queue.push({
        message: { type: "transcribe", id: randomUUID(), audio, punctuate },
        settle: resolve,
        timeoutMs: this.timeouts.transcribeMs + seconds * this.timeouts.perAudioSecondMs,
        timer: null,
      });
      if (worker.queue.length === 1) this.sendNext(worker);
    });
  }

  /** Sends the oldest waiting request and starts its clock. */
  private sendNext(worker: Worker): void {
    const [request] = worker.queue;
    if (!request) return;
    request.timer = setTimeout(() => {
      worker.queue.shift();
      request.settle(failure(MESSAGES.timedOut));
      // The rest fail as the worker exits.
      this.stop(worker);
    }, request.timeoutMs);
    worker.process.postMessage(request.message);
  }

  private settle(worker: Worker, reply: Exclude<WorkerReply, { type: "ready" }>): void {
    const [request] = worker.queue;
    if (request?.message.id !== reply.id) return;
    worker.queue.shift();
    if (request.timer) clearTimeout(request.timer);
    if (reply.type === "text") request.settle({ success: true, data: cleanTranscript(reply.text) });
    else {
      console.error("[hohe] transcription failed:", reply.error);
      request.settle(failure(MESSAGES.failed));
    }
    this.sendNext(worker);
  }

  private failAll(worker: Worker, message: string): void {
    for (const request of worker.queue.splice(0)) {
      if (request.timer) clearTimeout(request.timer);
      request.settle(failure(message));
    }
  }

  private scheduleIdleShutdown(): void {
    this.cancelIdleShutdown();
    if (!this.worker || this.busy > 0) return;
    const worker = this.worker;
    this.idleTimer = setTimeout(() => {
      if (this.busy > 0 || this.worker !== worker) return;
      this.stop(worker);
    }, this.timeouts.idleMs);
    this.idleTimer.unref();
  }

  private cancelIdleShutdown(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}
