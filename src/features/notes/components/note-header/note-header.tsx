"use client";

import { Star01, Trash01 } from "@untitledui/icons";
import type { Editor } from "@tiptap/react";
import { DictateButton } from "@/features/notes/components/dictate-button";
import { IconButton } from "@/features/notes/components/icon-button";
import { useSelectedMicrophone } from "@/features/notes/hooks/use-microphones";
import type { SaveState } from "@/features/notes/hooks/use-note-editor";
import { formatDateTime } from "@/features/notes/lib/format";
import { insertDictated, placeDictationCursor } from "@/features/notes/lib/insert-dictated";
import { wordCount } from "@/features/notes/lib/note-text";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import type { DictationState } from "@/features/notes/stores/dictation-store";
import { selectedModel, useEngineStore } from "@/features/notes/stores/engine-store";
import { useMicrophoneStore } from "@/features/notes/stores/microphone-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import type { Note } from "@shared/types/note";

/** One shared object: a selector returning a fresh one each time would re-render forever. */
const IDLE: DictationState = { kind: "idle" };

const SAVE_LABELS: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  failed: "Couldn't save your edit",
  "too-long": "Too long to save. Split it into two notes.",
};

interface NoteHeaderProps {
  note: Note;
  editor: Editor | null;
  saveState: SaveState;
  /** The note can't be typed into: it is being transcribed or is in the Trash. */
  readOnly: boolean;
}

/** Above the note: when it was edited, and what to do with it (dictate, favourite, trash). */
export function NoteHeader({ note, editor, saveState, readOnly }: NoteHeaderProps) {
  const toggleFavorite = useNotesStore((state) => state.toggleFavorite);
  const moveToTrash = useNotesStore((state) => state.moveToTrash);
  const dictation = useDictationStore((state) => (state.noteId === note.id ? state.state : IDLE));
  const dictatingElsewhere = useDictationStore(
    (state) => state.noteId !== note.id && (state.state.kind === "listening" || state.state.kind === "starting"),
  );
  const recording = useMicrophoneStore((state) => state.recording);
  const startDictation = useDictationStore((state) => state.start);
  const stopDictation = useDictationStore((state) => state.stop);
  const model = useEngineStore(selectedModel);
  const microphone = useSelectedMicrophone();
  const trashed = note.trashedAt !== null;
  const words = wordCount(note.text);

  const dictate = () => {
    if (!editor) return;
    placeDictationCursor(editor);
    void startDictation(microphone, model, { noteId: note.id, insert: (text) => insertDictated(editor, text) });
  };

  return (
    <header className="drag-region flex h-13 shrink-0 items-center gap-2 border-b border-line px-5">
      <p className="min-w-0 flex-1 truncate text-xs text-muted" aria-live="polite">
        <span>Edited {formatDateTime(note.updatedAt)}</span>
        <span aria-hidden> · </span>
        <span>
          {words} {words === 1 ? "word" : "words"}
        </span>
        {SAVE_LABELS[saveState] ? (
          <>
            <span aria-hidden> · </span>
            <span className={saveState === "failed" || saveState === "too-long" ? "text-accent-ink" : undefined}>
              {SAVE_LABELS[saveState]}
            </span>
          </>
        ) : null}
      </p>
      {trashed ? null : (
        <>
          <DictateButton
            state={dictation}
            disabled={readOnly || !editor || dictatingElsewhere || recording}
            onStart={dictate}
            onStop={() => void stopDictation()}
          />
          <IconButton
            label={note.favorite ? "Remove from Favorites" : "Add to Favorites"}
            pressed={note.favorite}
            onClick={() => void toggleFavorite(note.id)}
          >
            <Star01 className="size-4" fill={note.favorite ? "currentColor" : "none"} />
          </IconButton>
          <IconButton label="Move to Trash" tone="danger" onClick={() => void moveToTrash(note.id)}>
            <Trash01 className="size-4" />
          </IconButton>
        </>
      )}
    </header>
  );
}
