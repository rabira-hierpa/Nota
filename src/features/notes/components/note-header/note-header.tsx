"use client";

import { useEffect, useRef } from "react";
import { Expand01, Lock01, Minimize01, Pin02, Star01 } from "@untitledui/icons";
import type { Editor } from "@tiptap/react";
import { DictateButton } from "@/features/notes/components/dictate-button";
import { IconButton } from "@/features/notes/components/icon-button";
import { NoteMenu } from "@/features/notes/components/note-menu";
import { useSelectedMicrophone } from "@/features/notes/hooks/use-microphones";
import type { SaveState } from "@/features/notes/hooks/use-note-editor";
import { onCommand } from "@/features/notes/lib/command-bus";
import { formatDateTime } from "@/features/notes/lib/format";
import { insertDictated, placeDictationCursor } from "@/features/notes/lib/insert-dictated";
import { wordCount } from "@/features/notes/lib/note-text";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import type { DictationState } from "@/features/notes/stores/dictation-store";
import { selectedModel, useEngineStore } from "@/features/notes/stores/engine-store";
import { useMicrophoneStore } from "@/features/notes/stores/microphone-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useViewStore } from "@/features/notes/stores/view-store";
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

/** Above the note: when it was edited, and what to do with it (dictate, Zen mode, favourite, the menu). */
export function NoteHeader({ note, editor, saveState, readOnly }: NoteHeaderProps) {
  const toggleFavorite = useNotesStore((state) => state.toggleFavorite);
  const zen = useViewStore((state) => state.zen);
  const setZen = useViewStore((state) => state.setZen);
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

  const dictationBlocked = readOnly || !editor || dictatingElsewhere || recording;
  const dictate = () => {
    if (!editor) return;
    placeDictationCursor(editor);
    void startDictation(microphone, model, { noteId: note.id, insert: (text) => insertDictated(editor, text) });
  };

  // ⌘⇧D and ⌘D act on this note; the latest values are read when the key comes.
  const latest = useRef({ dictation, dictationBlocked, dictate, stopDictation, toggleFavorite, noteId: note.id, trashed });
  useEffect(() => {
    latest.current = { dictation, dictationBlocked, dictate, stopDictation, toggleFavorite, noteId: note.id, trashed };
  });
  useEffect(() => {
    const offs = [
      onCommand("dictate", () => {
        const current = latest.current;
        if (current.dictation.kind === "listening") void current.stopDictation();
        else if (!current.dictationBlocked && !current.trashed) current.dictate();
      }),
      onCommand("toggleFavorite", () => {
        if (!latest.current.trashed) void latest.current.toggleFavorite(latest.current.noteId);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <header className="drag-region flex h-13 shrink-0 items-center gap-2 border-b border-line px-5">
      <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-xs text-muted" aria-live="polite">
        {note.pinned ? (
          <>
            <Pin02 className="size-3.5 shrink-0 text-accent" aria-hidden />
            <span className="sr-only">Pinned.</span>
          </>
        ) : null}
        {note.lock ? (
          <>
            <Lock01 className="size-3.5 shrink-0 text-accent" aria-hidden />
            <span className="sr-only">Locked.</span>
          </>
        ) : null}
        <span data-zen-hide>Edited {formatDateTime(note.updatedAt)}</span>
        <span aria-hidden data-zen-hide> · </span>
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
            disabled={dictationBlocked}
            onStart={dictate}
            onStop={() => void stopDictation()}
          />
          <IconButton label={zen ? "Leave Zen mode (Esc)" : "Zen mode (⌘⇧F)"} pressed={zen} onClick={() => setZen(!zen)}>
            {zen ? <Minimize01 className="size-4" /> : <Expand01 className="size-4" />}
          </IconButton>
          <span className="contents" data-zen-hide>
            <IconButton
              label={note.favorite ? "Remove from Favorites" : "Add to Favorites"}
              pressed={note.favorite}
              onClick={() => void toggleFavorite(note.id)}
            >
              <Star01 className="size-4" fill={note.favorite ? "currentColor" : "none"} />
            </IconButton>
            <NoteMenu note={note} editor={editor} />
          </span>
        </>
      )}
    </header>
  );
}
