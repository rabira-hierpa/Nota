import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { NotesRepo } from "@main/lib/notes-repo";
import { transcriptToHtml, transcriptToText } from "@main/lib/transcript-html";
import { MAX_DURATION_MS, MAX_TRANSCRIPT_LENGTH, noteIdSchema, transcriptionSchema } from "@shared/schemas/note";
import type { Note } from "@shared/types/note";

/** Before Nota, every capture was a "recording": a WAV plus an entry in recordings.json. */
const INDEX_FILE = "recordings.json";
/** Written once the recordings are notes, so a note deleted later never comes back. */
const IMPORTED_MARKER = ".imported-to-notes";

const legacyRecordingSchema = z.object({
  id: noteIdSchema,
  createdAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative().max(MAX_DURATION_MS),
  transcript: z.string().max(MAX_TRANSCRIPT_LENGTH),
  transcription: transcriptionSchema,
});
type LegacyRecording = z.infer<typeof legacyRecordingSchema>;
const legacyIndexSchema = z.object({ version: z.literal(1), recordings: z.array(legacyRecordingSchema) });

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readLegacyIndex(recordingsDir: string): Promise<LegacyRecording[] | null> {
  try {
    const raw = await readFile(path.join(recordingsDir, INDEX_FILE), "utf8");
    return legacyIndexSchema.parse(JSON.parse(raw)).recordings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function recordingToNote(recording: LegacyRecording, hasAudio: boolean): Note {
  const { transcription } = recording;
  return {
    id: recording.id,
    createdAt: recording.createdAt,
    updatedAt: transcription.status === "done" ? transcription.transcribedAt : recording.createdAt,
    content: transcriptToHtml(recording.transcript),
    text: transcriptToText(recording.transcript),
    favorite: false,
    pinned: false,
    archivedAt: null,
    trashedAt: null,
    audio: hasAudio ? { durationMs: recording.durationMs, transcription } : null,
    lock: null,
  };
}

/**
 * Turns each recording from before Nota into a note, once. The recordings
 * folder is left as it was (the WAVs are copied), so nothing is lost if this
 * goes wrong; the import is retried on the next launch until it completes.
 */
export async function importLegacyRecordings(recordingsDir: string, repo: NotesRepo): Promise<number> {
  const marker = path.join(recordingsDir, IMPORTED_MARKER);
  if (await exists(marker)) return 0;
  const recordings = await readLegacyIndex(recordingsDir);
  if (!recordings) return 0;

  let imported = 0;
  for (const recording of recordings) {
    const audioFile = path.join(recordingsDir, `${recording.id}.wav`);
    const hasAudio = await exists(audioFile);
    if (await repo.importNote(recordingToNote(recording, hasAudio), hasAudio ? audioFile : null)) imported += 1;
  }
  await writeFile(marker, `${new Date().toISOString()}\n`, "utf8");
  return imported;
}
