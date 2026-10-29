import { SILENT_PEAK } from "@/features/notes/lib/audio-level";
import { formatDuration } from "@/features/notes/lib/format";
import { currentMessages } from "@/lib/i18n";
import type { Messages } from "@/lib/i18n";
import { IMPORT_AUDIO_EXTENSIONS, MAX_DURATION_MS } from "@shared/schemas/note";

/** Shorter than this, there is nothing to transcribe. */
export const MIN_IMPORT_DURATION_MS = 300;

const EXTENSION = /\.([a-z\d]+)$/i;

/** A file worth trying to decode: an audio type, or a recording's usual extension (Finder often sends no type). */
export function isAudioFile(file: { name: string; type: string }): boolean {
  if (file.type.startsWith("audio/")) return true;
  const extension = EXTENSION.exec(file.name)?.[1]?.toLowerCase() ?? "";
  return IMPORT_AUDIO_EXTENSIONS.some((known) => known === extension);
}

type ImportWords = Messages["errors"]["import"];

/**
 * Why a recording can't be transcribed as it is, or null when it can, in the
 * interface's language. Duration may be unknown (NaN) before decoding.
 */
export function importProblem(
  durationMs: number,
  peak = 1,
  words: ImportWords = currentMessages().errors.import,
): string | null {
  if (durationMs > MAX_DURATION_MS) return words.tooLong(formatDuration(durationMs), formatDuration(MAX_DURATION_MS));
  if (durationMs < MIN_IMPORT_DURATION_MS) return words.tooShort;
  if (peak < SILENT_PEAK) return words.silent;
  return null;
}

export function unreadableMessage(name: string, words: ImportWords = currentMessages().errors.import): string {
  return words.unreadable(name);
}
