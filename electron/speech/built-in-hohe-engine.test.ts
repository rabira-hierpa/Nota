import { afterEach, describe, expect, it, vi } from "vitest";
import { BuiltInHoheEngine } from "@main/speech/built-in-hohe-engine";
import type { SpeechWorker, WorkerTimeouts } from "@main/speech/built-in-hohe-engine";
import type { WorkerReply, WorkerRequest } from "@main/speech/worker-protocol";
import { amharicMessages, BUILT_IN_MESSAGES } from "@shared/messages";

const TIMEOUTS: WorkerTimeouts = { loadMs: 1000, transcribeMs: 5000, perAudioSecondMs: 1000, idleMs: 60_000 };
const AUDIO = new Uint8Array([1, 2, 3]);
/** Ten seconds of 16 kHz 16-bit audio, as far as the timeout is concerned. */
const TEN_SECONDS = new Uint8Array(10 * 32_000);
const hohe = amharicMessages("hohe");

class FakeWorker implements SpeechWorker {
  readonly sent: WorkerRequest[] = [];
  killed = false;
  /** A real process exits a moment after it is killed; false holds the exit back. */
  exitsWhenKilled = true;
  private messageListener: (message: WorkerReply | null) => void = () => undefined;
  private exitListener: (code: number) => void = () => undefined;

  postMessage(message: WorkerRequest): void {
    this.sent.push(message);
  }
  onMessage(listener: (message: WorkerReply | null) => void): void {
    this.messageListener = listener;
  }
  onExit(listener: (code: number) => void): void {
    this.exitListener = listener;
  }
  kill(): void {
    this.killed = true;
    if (this.exitsWhenKilled) this.exitListener(15);
  }
  reply(message: WorkerReply): void {
    this.messageListener(message);
  }
  exit(code: number): void {
    this.exitListener(code);
  }
  /** The id of the last transcription asked for. */
  lastId(): string {
    const last = this.sent.findLast((message) => message.type === "transcribe");
    return last?.type === "transcribe" ? last.id : "";
  }
}

function setUp() {
  const workers: FakeWorker[] = [];
  const engine = new BuiltInHoheEngine(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  }, TIMEOUTS);
  return { engine, workers };
}

/** Lets the engine's awaits run. */
const tick = () => new Promise((resolve) => setImmediate(resolve));

afterEach(() => {
  vi.useRealTimers();
});

describe("BuiltInHoheEngine", () => {
  it("is built in and ready without setup", async () => {
    const { engine } = setUp();
    expect(engine.builtIn).toBe(true);
    expect(await engine.status()).toEqual({ kind: "online" });
  });

  it("loads Hohe first, then transcribes, punctuating only when asked", async () => {
    const { engine, workers } = setUp();
    const result = engine.transcribe(AUDIO, "note.wav", { punctuate: true });
    const [worker] = workers;
    expect(worker.sent).toEqual([{ type: "prepare" }]);
    worker.reply({ type: "ready" });
    await tick();
    expect(worker.sent[1]).toMatchObject({ type: "transcribe", audio: AUDIO, punctuate: true });
    worker.reply({ type: "text", id: worker.lastId(), text: "  ሰላም   ነው። " });
    expect(await result).toEqual({ success: true, data: "ሰላም ነው።" });

    const clip = engine.transcribe(AUDIO, "dictation.wav");
    await tick();
    expect(worker.sent[2]).toMatchObject({ type: "transcribe", punctuate: false });
    worker.reply({ type: "text", id: worker.lastId(), text: "ቡና" });
    expect(await clip).toEqual({ success: true, data: "ቡና" });
    expect(workers).toHaveLength(1);
  });

  it("says when Hohe couldn't load, and starts afresh next time", async () => {
    const { engine, workers } = setUp();
    const first = engine.transcribe(AUDIO, "note.wav");
    workers[0].reply({ type: "error", id: null, error: "no binding" });
    expect(await first).toEqual({ success: false, error: BUILT_IN_MESSAGES.failedToStart });
    expect(workers[0].killed).toBe(true);
    expect(await engine.status()).toEqual({ kind: "offline", reason: BUILT_IN_MESSAGES.failedToStart });

    const second = engine.transcribe(AUDIO, "note.wav");
    expect(workers).toHaveLength(2);
    workers[1].reply({ type: "ready" });
    await tick();
    workers[1].reply({ type: "text", id: workers[1].lastId(), text: "ሰላም" });
    expect(await second).toEqual({ success: true, data: "ሰላም" });
    expect(await engine.status()).toEqual({ kind: "online" });
  });

  it("reports a failed transcription without its detail", async () => {
    const { engine, workers } = setUp();
    const result = engine.transcribe(AUDIO, "note.wav");
    workers[0].reply({ type: "ready" });
    await tick();
    workers[0].reply({ type: "error", id: workers[0].lastId(), error: "not a WAV file" });
    expect(await result).toEqual({ success: false, error: hohe.failed });
  });

  it("fails waiting requests when the worker dies", async () => {
    const { engine, workers } = setUp();
    const result = engine.transcribe(AUDIO, "note.wav");
    workers[0].reply({ type: "ready" });
    await tick();
    workers[0].exit(1);
    expect(await result).toEqual({ success: false, error: hohe.stopped });
  });

  it("gives up on a load or a transcription that takes too long", async () => {
    vi.useFakeTimers();
    const { engine, workers } = setUp();
    const slowLoad = engine.transcribe(AUDIO, "note.wav");
    await vi.advanceTimersByTimeAsync(TIMEOUTS.loadMs);
    expect(await slowLoad).toEqual({ success: false, error: BUILT_IN_MESSAGES.failedToStart });

    const slowRun = engine.transcribe(AUDIO, "note.wav");
    workers[1].reply({ type: "ready" });
    await vi.advanceTimersByTimeAsync(TIMEOUTS.transcribeMs);
    expect(await slowRun).toEqual({ success: false, error: hohe.timedOut });
    expect(workers[1].killed).toBe(true);
  });

  it("says Hohe couldn't start when the worker dies while loading", async () => {
    const { engine, workers } = setUp();
    const result = engine.transcribe(AUDIO, "note.wav");
    workers[0].exit(9);
    expect(await result).toEqual({ success: false, error: BUILT_IN_MESSAGES.failedToStart });
    expect(await engine.status()).toEqual({ kind: "offline", reason: BUILT_IN_MESSAGES.failedToStart });
  });

  it("ignores a worker it has given up on", async () => {
    vi.useFakeTimers();
    const { engine, workers } = setUp();
    const result = engine.transcribe(AUDIO, "note.wav");
    await vi.advanceTimersByTimeAsync(TIMEOUTS.loadMs);
    expect(await result).toEqual({ success: false, error: BUILT_IN_MESSAGES.failedToStart });
    workers[0].reply({ type: "ready" });
    expect(await engine.status()).toEqual({ kind: "offline", reason: BUILT_IN_MESSAGES.failedToStart });
  });

  it("sends one request at a time and times each from when it is sent", async () => {
    vi.useFakeTimers();
    const { engine, workers } = setUp();
    const first = engine.transcribe(AUDIO, "first.wav", { punctuate: true });
    const second = engine.transcribe(AUDIO, "second.wav", { punctuate: true });
    const [worker] = workers;
    worker.reply({ type: "ready" });
    await vi.advanceTimersByTimeAsync(TIMEOUTS.transcribeMs - 1);
    expect(worker.sent.filter((message) => message.type === "transcribe")).toHaveLength(1);
    worker.reply({ type: "text", id: worker.lastId(), text: "አንድ" });

    // The second waited almost a full timeout, which doesn't count against it.
    await vi.advanceTimersByTimeAsync(TIMEOUTS.transcribeMs - 1);
    worker.reply({ type: "text", id: worker.lastId(), text: "ሁለት" });
    expect(await first).toEqual({ success: true, data: "አንድ" });
    expect(await second).toEqual({ success: true, data: "ሁለት" });
    expect(worker.killed).toBe(false);
  });

  it("gives a longer recording more time", async () => {
    vi.useFakeTimers();
    const { engine, workers } = setUp();
    const result = engine.transcribe(TEN_SECONDS, "note.wav");
    workers[0].reply({ type: "ready" });
    await vi.advanceTimersByTimeAsync(TIMEOUTS.transcribeMs + 10 * TIMEOUTS.perAudioSecondMs - 1);
    workers[0].reply({ type: "text", id: workers[0].lastId(), text: "ሰላም" });
    expect(await result).toEqual({ success: true, data: "ሰላም" });
  });

  it("keeps a new worker's requests when an old one exits late", async () => {
    vi.useFakeTimers();
    const { engine, workers } = setUp();
    const slow = engine.transcribe(AUDIO, "slow.wav");
    workers[0].exitsWhenKilled = false;
    workers[0].reply({ type: "ready" });
    await vi.advanceTimersByTimeAsync(TIMEOUTS.transcribeMs);
    expect(await slow).toEqual({ success: false, error: hohe.timedOut });

    const next = engine.transcribe(AUDIO, "next.wav");
    workers[1].reply({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);
    workers[0].exit(15);
    workers[1].reply({ type: "text", id: workers[1].lastId(), text: "ሰላም" });
    expect(await next).toEqual({ success: true, data: "ሰላም" });
  });

  it("stops the worker when idle, and when another model is used", async () => {
    vi.useFakeTimers();
    const { engine, workers } = setUp();
    engine.prepare();
    engine.prepare();
    expect(workers).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(TIMEOUTS.idleMs);
    expect(workers[0].killed).toBe(true);

    engine.prepare();
    engine.release();
    expect(workers[1].killed).toBe(true);
  });

  it("keeps the worker while a request is in flight", async () => {
    const { engine, workers } = setUp();
    const result = engine.transcribe(AUDIO, "note.wav");
    engine.release();
    expect(workers[0].killed).toBe(false);
    workers[0].reply({ type: "ready" });
    await tick();
    workers[0].reply({ type: "text", id: workers[0].lastId(), text: "ሰላም" });
    expect(await result).toEqual({ success: true, data: "ሰላም" });
  });
});
