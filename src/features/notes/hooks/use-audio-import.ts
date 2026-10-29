"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { importProblem, unreadableMessage } from "@/features/notes/lib/audio-import";
import { mediaDurationMs } from "@/features/notes/lib/media-duration";
import { toMonoWav } from "@/features/notes/lib/to-mono-wav";
import type { CreateVoiceNoteInput, Note, OpenedAudio } from "@shared/types/note";
import type { Result } from "@shared/types/result";

export type ImportState = { kind: "idle" } | { kind: "converting"; name: string } | { kind: "error"; message: string };

interface AudioImportOptions {
  /** Asks for a file (the open dialog). */
  pick: () => Promise<Result<OpenedAudio | null>>;
  /** Saves the converted recording as a voice note, which starts its transcription. */
  onImported: (audio: CreateVoiceNoteInput) => Promise<Result<Note>>;
}

/**
 * A recording made elsewhere (a phone's voice memo, a Telegram voice
 * message) becomes a voice note: checked for length, converted to 16 kHz
 * mono WAV like Nota's own recordings, then transcribed.
 */
export function useAudioImport({ pick, onImported }: AudioImportOptions) {
  const [state, setState] = useState<ImportState>({ kind: "idle" });
  const latest = useRef({ pick, onImported });

  useEffect(() => {
    latest.current = { pick, onImported };
  }, [pick, onImported]);

  const importBlob = useCallback(async (blob: Blob, name: string) => {
    setState({ kind: "converting", name });
    try {
      const tooLong = importProblem(await mediaDurationMs(blob));
      if (tooLong) {
        setState({ kind: "error", message: tooLong });
        return;
      }
      const { input, peak } = await toMonoWav(blob);
      const problem = importProblem(input.durationMs, peak);
      if (problem) {
        setState({ kind: "error", message: problem });
        return;
      }
      const saved = await latest.current.onImported(input);
      setState(saved.success ? { kind: "idle" } : { kind: "error", message: saved.error });
    } catch {
      setState({ kind: "error", message: unreadableMessage(name) });
    }
  }, []);

  const choose = useCallback(async () => {
    const picked = await latest.current.pick();
    if (!picked.success) setState({ kind: "error", message: picked.error });
    else if (picked.data) await importBlob(new Blob([picked.data.data.slice()]), picked.data.name);
  }, [importBlob]);

  const importFile = useCallback((file: File) => importBlob(file, file.name), [importBlob]);
  const fail = useCallback((message: string) => setState({ kind: "error", message }), []);

  return { state, choose, importFile, fail };
}
