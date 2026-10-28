"use client";

import { useEffect } from "react";
import { EditorContent } from "@tiptap/react";
import { AudioBar } from "@/features/notes/components/audio-bar";
import { EditorToolbar } from "@/features/notes/components/editor-toolbar";
import { NoteHeader } from "@/features/notes/components/note-header";
import { NoteNotice } from "@/features/notes/components/note-notice";
import { TrashBanner } from "@/features/notes/components/trash-banner";
import { useNoteEditor } from "@/features/notes/hooks/use-note-editor";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import type { Note } from "@shared/types/note";

const PLACEHOLDERS = {
  transcribing: "Transcribing your recording…",
  pending: "This recording hasn't been transcribed yet. Press Transcribe below, or type.",
  write: "Write, or press Dictate and speak",
} as const;

function placeholderFor(note: Note, transcribing: boolean): string {
  if (transcribing) return PLACEHOLDERS.transcribing;
  return note.audio?.transcription.status === "pending" ? PLACEHOLDERS.pending : PLACEHOLDERS.write;
}

interface NoteEditorProps {
  note: Note;
}

/**
 * One open note: header, formatting, the text itself and, for a spoken note,
 * its recording. Mounted per note (and per transcription) by the caller.
 */
export function NoteEditor({ note }: NoteEditorProps) {
  const transcribing = useNotesStore((state) => state.transcribingIds.includes(note.id));
  const dictating = useDictationStore((state) => state.noteId === note.id && state.state.kind !== "idle" && state.state.kind !== "error");
  const trashed = note.trashedAt !== null;
  const readOnly = transcribing || trashed;
  const { editor, saveState } = useNoteEditor(note, readOnly, placeholderFor(note, transcribing));

  // Leaving the note while dictating: stop, and let the last words land in the note itself.
  useEffect(() => () => useDictationStore.getState().detach(note.id), [note.id]);

  return (
    <main className="flex min-h-0 flex-col bg-paper">
      <NoteHeader note={note} editor={editor} saveState={saveState} readOnly={readOnly} />
      {trashed ? <TrashBanner noteId={note.id} /> : null}
      {editor && !trashed ? <EditorToolbar editor={editor} disabled={readOnly} /> : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-8">
        <NoteNotice note={note} transcribing={transcribing} />
        <EditorContent editor={editor} className="mx-auto max-w-[720px] pb-24 pt-8 [&_.nota-editor]:min-h-[60vh]" />
      </div>
      {note.audio ? (
        <AudioBar note={{ ...note, audio: note.audio }} transcribing={transcribing} locked={dictating || trashed} />
      ) : null}
    </main>
  );
}
