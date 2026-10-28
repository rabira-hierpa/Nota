import { z } from "zod";
import { modelIdSchema } from "@shared/schemas/engine";

/** Recordings are capped so a forgotten recorder can't fill the disk. */
export const MAX_DURATION_MS = 30 * 60 * 1000;
/** 16 kHz mono 16-bit WAV is 32 KB/s; 30 minutes plus headroom. */
export const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
export const MAX_TRANSCRIPT_LENGTH = 50_000;
/** The editor's HTML: formatting makes it several times longer than the text. */
export const MAX_NOTE_HTML_LENGTH = 1_000_000;
export const MAX_NOTE_TEXT_LENGTH = 200_000;
/** Dictation sends speech up to each pause; the segmenter cuts long stretches well before this. */
export const MAX_CLIP_DURATION_MS = 60_000;
/** A WAV header alone is 44 bytes; anything that small carries no audio. */
const WAV_HEADER_BYTES = 44;
const WAV_BYTES_PER_SECOND = 32_000;
const MAX_CLIP_BYTES = WAV_HEADER_BYTES + (MAX_CLIP_DURATION_MS / 1000) * WAV_BYTES_PER_SECOND;

export const noteIdSchema = z.uuid();

function wavSchema(maxBytes: number) {
  return z
    .instanceof(Uint8Array)
    .refine(
      (audio) => audio.byteLength > WAV_HEADER_BYTES && audio.byteLength <= maxBytes,
      "Audio is empty or too large.",
    );
}

/**
 * What the engine last did with a note's recording. "transcribing" is not
 * stored: it only exists while a request is in flight, so the renderer
 * tracks it. `model` is absent on transcriptions from before there was a choice.
 */
export const transcriptionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("done"), transcribedAt: z.iso.datetime(), model: modelIdSchema.optional() }),
  z.object({ status: z.literal("error"), message: z.string().max(500) }),
]);

/** The voice recording a note was made from, if any. The WAV itself lives beside the note. */
export const noteAudioSchema = z.object({
  durationMs: z.number().int().nonnegative().max(MAX_DURATION_MS),
  transcription: transcriptionSchema,
});

/**
 * A note: rich text from the editor (`content`, HTML) and the same text
 * without formatting (`text`) for titles, previews, tags and search.
 */
export const noteSchema = z.object({
  id: noteIdSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  content: z.string().max(MAX_NOTE_HTML_LENGTH),
  text: z.string().max(MAX_NOTE_TEXT_LENGTH),
  favorite: z.boolean(),
  /** Set while the note is in the Trash. */
  trashedAt: z.iso.datetime().nullable(),
  audio: noteAudioSchema.nullable(),
});

const noteContentFields = {
  content: z.string().max(MAX_NOTE_HTML_LENGTH),
  text: z.string().max(MAX_NOTE_TEXT_LENGTH),
};

export const createNoteInputSchema = z.object(noteContentFields).strict();

/** A recording that becomes a new note once transcribed. */
export const createVoiceNoteInputSchema = z
  .object({
    audio: wavSchema(MAX_AUDIO_BYTES),
    durationMs: z.number().int().positive().max(MAX_DURATION_MS),
  })
  .strict();

export const updateNoteContentInputSchema = z.object({ id: noteIdSchema, ...noteContentFields }).strict();

export const setFavoriteInputSchema = z.object({ id: noteIdSchema, favorite: z.boolean() }).strict();

export const setTrashedInputSchema = z.object({ id: noteIdSchema, trashed: z.boolean() }).strict();

/** Keeps a dictation's audio with the note it was dictated into. */
export const attachAudioInputSchema = z
  .object({
    id: noteIdSchema,
    audio: wavSchema(MAX_AUDIO_BYTES),
    durationMs: z.number().int().positive().max(MAX_DURATION_MS),
    /** The model that already wrote the text while it was spoken; absent if some of it was missed. */
    transcribedBy: modelIdSchema.optional(),
  })
  .strict();

export const transcribeInputSchema = z.object({ id: noteIdSchema, model: modelIdSchema }).strict();

/** One stretch of dictated speech, transcribed without being saved. */
export const transcribeClipInputSchema = z
  .object({
    audio: wavSchema(MAX_CLIP_BYTES),
    model: modelIdSchema,
  })
  .strict();
