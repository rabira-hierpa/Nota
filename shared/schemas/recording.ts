import { z } from "zod";
import { modelIdSchema } from "@shared/schemas/engine";

/** Recordings are capped so a forgotten recorder can't fill the disk. */
export const MAX_DURATION_MS = 30 * 60 * 1000;
/** 16 kHz mono 16-bit WAV is 32 KB/s; 30 minutes plus headroom. */
export const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
export const MAX_TRANSCRIPT_LENGTH = 50_000;
/** Dictation sends speech up to each pause; the segmenter cuts long stretches well before this. */
export const MAX_CLIP_DURATION_MS = 60_000;
/** A WAV header alone is 44 bytes; anything that small carries no audio. */
const WAV_HEADER_BYTES = 44;
const WAV_BYTES_PER_SECOND = 32_000;
const MAX_CLIP_BYTES = WAV_HEADER_BYTES + (MAX_CLIP_DURATION_MS / 1000) * WAV_BYTES_PER_SECOND;

export const recordingIdSchema = z.uuid();

function wavSchema(maxBytes: number) {
  return z
    .instanceof(Uint8Array)
    .refine(
      (audio) => audio.byteLength > WAV_HEADER_BYTES && audio.byteLength <= maxBytes,
      "Audio is empty or too large.",
    );
}

/**
 * What the engine last did with a recording. "transcribing" is not stored:
 * it only exists while a request is in flight, so the renderer tracks it.
 * `model` is absent on recordings made before there was a choice.
 */
export const transcriptionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("done"), transcribedAt: z.iso.datetime(), model: modelIdSchema.optional() }),
  z.object({ status: z.literal("error"), message: z.string().max(500) }),
]);

export const recordingSchema = z.object({
  id: recordingIdSchema,
  createdAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative().max(MAX_DURATION_MS),
  transcript: z.string().max(MAX_TRANSCRIPT_LENGTH),
  transcription: transcriptionSchema,
});

export const createRecordingInputSchema = z
  .object({
    audio: wavSchema(MAX_AUDIO_BYTES),
    durationMs: z.number().int().positive().max(MAX_DURATION_MS),
    /** Text dictation already produced; the recording is then saved as transcribed. */
    dictated: z
      .object({ transcript: z.string().max(MAX_TRANSCRIPT_LENGTH), model: modelIdSchema })
      .strict()
      .optional(),
  })
  .strict();

export const transcribeInputSchema = z
  .object({
    id: recordingIdSchema,
    model: modelIdSchema,
  })
  .strict();

/** One stretch of dictated speech, transcribed without being saved. */
export const transcribeClipInputSchema = z
  .object({
    audio: wavSchema(MAX_CLIP_BYTES),
    model: modelIdSchema,
  })
  .strict();

export const updateTranscriptInputSchema = z
  .object({
    id: recordingIdSchema,
    transcript: z.string().max(MAX_TRANSCRIPT_LENGTH),
  })
  .strict();
