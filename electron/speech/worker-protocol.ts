import { z } from "zod";

/**
 * Messages between the main process and the speech worker
 * (electron/speech/speech-worker.ts, an Electron utility process).
 */

export const workerRequestSchema = z.discriminatedUnion("type", [
  /** Load Hohe now, so the first transcription doesn't wait for it. */
  z.object({ type: z.literal("prepare") }),
  z.object({
    type: z.literal("transcribe"),
    id: z.string(),
    /** A 16 kHz mono 16-bit WAV. */
    audio: z.custom<Uint8Array>((value) => value instanceof Uint8Array),
    /** Put sentence ends back: for whole recordings, not dictated phrases. */
    punctuate: z.boolean(),
  }),
]);
export type WorkerRequest = z.infer<typeof workerRequestSchema>;

export const workerReplySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("text"), id: z.string(), text: z.string() }),
  /** `id` is null when loading failed. `error` is for the log: never transcript text. */
  z.object({ type: z.literal("error"), id: z.string().nullable(), error: z.string() }),
]);
export type WorkerReply = z.infer<typeof workerReplySchema>;
