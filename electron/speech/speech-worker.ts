import { Hohe, Punctuator } from "@main/speech/recognizer";
import { readWav } from "@main/speech/wav";
import { workerRequestSchema } from "@main/speech/worker-protocol";
import type { WorkerReply, WorkerRequest } from "@main/speech/worker-protocol";

/**
 * The built-in speech models, in an Electron utility process: ONNX Runtime
 * keeps a thread busy while it runs, and a crash here can't take the window
 * down. Started by BuiltInHoheEngine with `--models=<dir>`; one request at a
 * time, Hohe loaded on the first, the punctuation model on the first that
 * wants it.
 */

const MODELS_FLAG = "--models=";
const modelsDir = process.argv.find((arg) => arg.startsWith(MODELS_FLAG))?.slice(MODELS_FLAG.length) ?? "";
const port = process.parentPort;

let hohe: Promise<Hohe> | null = null;
let punctuator: Promise<Punctuator> | null = null;
let queue: Promise<void> = Promise.resolve();

function reply(message: WorkerReply): void {
  port.postMessage(message);
}

function describe(error: Error | string | object): string {
  return error instanceof Error ? error.message : String(error);
}

/** Loads once; a failed load is tried again next time. */
function once<T>(load: () => Promise<T>, forget: () => void): Promise<T> {
  return load().catch((error: Error) => {
    forget();
    throw error;
  });
}

function loadHohe(): Promise<Hohe> {
  hohe ??= once(
    async () => Hohe.load(await import("onnxruntime-node"), modelsDir),
    () => (hohe = null),
  );
  return hohe;
}

function loadPunctuator(): Promise<Punctuator> {
  punctuator ??= once(
    async () => Punctuator.load(await import("onnxruntime-node"), modelsDir),
    () => (punctuator = null),
  );
  return punctuator;
}

/** Sentence ends are a nicety: if the punctuation model fails, the text still arrives. */
async function withSentenceEnds(text: string): Promise<string> {
  try {
    return await (await loadPunctuator()).punctuate(text);
  } catch (error) {
    console.error("[speech] punctuation failed:", describe(error as Error));
    return text;
  }
}

async function transcribe({ id, audio, punctuate }: Extract<WorkerRequest, { type: "transcribe" }>): Promise<void> {
  const wav = readWav(audio);
  if (!wav.success) {
    reply({ type: "error", id, error: wav.error });
    return;
  }
  try {
    const text = await (await loadHohe()).transcribe(wav.data);
    reply({ type: "text", id, text: punctuate && text ? await withSentenceEnds(text) : text });
  } catch (error) {
    reply({ type: "error", id, error: describe(error as Error) });
  }
}

function handle(request: WorkerRequest): void {
  if (request.type === "prepare") {
    loadHohe().then(
      () => reply({ type: "ready" }),
      (error: Error) => reply({ type: "error", id: null, error: describe(error) }),
    );
    return;
  }
  queue = queue.then(() => transcribe(request));
}

port.on("message", ({ data }) => {
  const request = workerRequestSchema.safeParse(data);
  if (request.success) handle(request.data);
});
