"use client";

import { AlertCircle, XClose } from "@untitledui/icons";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";
import type { Note } from "@shared/types/note";

interface NoteNoticeProps {
  note: Note;
  transcribing: boolean;
}

/** Why something about this note failed, with what to do about it. One message at a time, most recent first. */
export function NoteNotice({ note, transcribing }: NoteNoticeProps) {
  const actionError = useNotesStore((state) => state.actionError);
  const dismissError = useNotesStore((state) => state.dismissError);
  const m = useMessages();
  const dictationError = useDictationStore((state) => {
    if (state.noteId !== note.id) return null;
    if (state.state.kind === "error") return state.state.message;
    return state.clipError ? m.errors.clipFailed(state.clipError) : null;
  });
  const transcription = note.audio?.transcription;
  const engineError = !transcribing && transcription?.status === "error" ? transcription.message : null;
  const message = actionError ?? dictationError ?? engineError;
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mx-auto mt-4 flex w-full max-w-[720px] items-start gap-2.5 rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13px] leading-5 text-warn-ink"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
      <p className="flex-1">{m.translate(message)}</p>
      {actionError ? (
        <button
          type="button"
          onClick={dismissError}
          aria-label={m.common.dismiss}
          className="cursor-pointer rounded p-0.5 text-warn hover:bg-hover"
        >
          <XClose className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
