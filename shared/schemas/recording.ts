import { z } from "zod";

/** Recordings are capped so a forgotten recorder can't fill the disk. */
export const MAX_DURATION_MS = 30 * 60 * 1000;
/** 16 kHz mono 16-bit WAV is 32 KB/s; 30 minutes plus headroom. */
export const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
export const MAX_TRANSCRIPT_LENGTH = 50_000;
/** A WAV header alone is 44 bytes; anything that small carries no audio. */
const WAV_HEADER_BYTES = 44;

export const recordingIdSchema = z.uuid();

/**
 * What the engine last did with a recording. "transcribing" is not stored:
 * it only exists while a request is in flight, so the renderer tracks it.
 */
export const transcriptionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("done"), transcribedAt: z.iso.datetime() }),
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
    audio: z
      .instanceof(Uint8Array)
      .refine(
        (audio) => audio.byteLength > WAV_HEADER_BYTES && audio.byteLength <= MAX_AUDIO_BYTES,
        "Audio is empty or too large.",
      ),
    durationMs: z.number().int().positive().max(MAX_DURATION_MS),
  })
  .strict();

export const updateTranscriptInputSchema = z
  .object({
    id: recordingIdSchema,
    transcript: z.string().max(MAX_TRANSCRIPT_LENGTH),
  })
  .strict();
