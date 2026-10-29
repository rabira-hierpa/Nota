import { z } from "zod";
import { modelIdSchema } from "@shared/schemas/engine";

/** Recordings are capped so a forgotten recorder can't fill the disk. */
export const MAX_DURATION_MS = 30 * 60 * 1000;
/** 16 kHz mono 16-bit WAV is 32 KB/s; 30 minutes plus headroom. */
export const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
export const MAX_TRANSCRIPT_LENGTH = 50_000;
/** A recording picked to transcribe, before it is decoded: room for 30 minutes of uncompressed CD-quality WAV. */
export const MAX_IMPORT_BYTES = 400 * 1024 * 1024;
/** What the file dialog offers; Chromium decodes all of these. */
export const IMPORT_AUDIO_EXTENSIONS = ["m4a", "mp3", "wav", "ogg", "opus", "oga", "webm", "flac", "aac", "mp4"] as const;
/** The editor's HTML: formatting makes it several times longer than the text. */
export const MAX_NOTE_HTML_LENGTH = 1_000_000;
export const MAX_NOTE_TEXT_LENGTH = 200_000;
/** A locked note's sealed body: its HTML and text, as UTF-8 (Ge'ez is 3 bytes a letter), in base64. */
const MAX_SEALED_LENGTH = Math.ceil(((MAX_NOTE_HTML_LENGTH + MAX_NOTE_TEXT_LENGTH) * 3 + 1024) / 3) * 4;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 200;
/** What an export may weigh: a note's HTML, wrapped in a styled page. */
const MAX_EXPORT_LENGTH = MAX_NOTE_HTML_LENGTH + 20_000;
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
 * A locked note keeps its body sealed (AES-256-GCM, key from the app
 * password). While locked, `content` is empty and `text` is the title alone.
 */
export const noteLockSchema = z.object({ body: z.string().max(MAX_SEALED_LENGTH) });

/**
 * A note: rich text from the editor (`content`, HTML) and the same text
 * without formatting (`text`) for titles, previews, tags and search. Fields
 * added after the first version default, so older note files still read.
 */
export const noteSchema = z.object({
  id: noteIdSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  content: z.string().max(MAX_NOTE_HTML_LENGTH),
  text: z.string().max(MAX_NOTE_TEXT_LENGTH),
  favorite: z.boolean(),
  /** Pinned notes lead every list they appear in. */
  pinned: z.boolean().default(false),
  /** Set while the note is in the Archive: kept, but out of the way. */
  archivedAt: z.iso.datetime().nullable().default(null),
  /** Set while the note is in the Trash. */
  trashedAt: z.iso.datetime().nullable(),
  audio: noteAudioSchema.nullable(),
  lock: noteLockSchema.nullable().default(null),
});

export const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH);

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

export const setPinnedInputSchema = z.object({ id: noteIdSchema, pinned: z.boolean() }).strict();

export const setArchivedInputSchema = z.object({ id: noteIdSchema, archived: z.boolean() }).strict();

export const setLockedInputSchema = z.object({ id: noteIdSchema, locked: z.boolean() }).strict();

export const exportFormatSchema = z.enum(["md", "html", "txt"]);

/** A note rendered by the renderer, for the main process to save where the user picks. */
export const exportNoteInputSchema = z
  .object({
    title: z.string().max(200),
    format: exportFormatSchema,
    data: z.string().max(MAX_EXPORT_LENGTH),
  })
  .strict();

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
