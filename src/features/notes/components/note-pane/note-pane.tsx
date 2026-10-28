"use client";

import dynamic from "next/dynamic";
import { EmptyNote } from "@/features/notes/components/empty-note";
import { LockScreen } from "@/features/notes/components/lock-screen";
import { useSelectedNote } from "@/features/notes/hooks/use-library";
import { isSealed, useNotesStore } from "@/features/notes/stores/notes-store";

// The editor (Tiptap and ProseMirror) is the heaviest code in the app: load it on its own.
const NoteEditor = dynamic(() => import("@/features/notes/components/note-editor").then((module) => module.NoteEditor), {
  ssr: false,
  loading: () => <main className="bg-paper" />,
});

/** Right column: the open note, or an invitation to write one. */
export function NotePane() {
  const note = useSelectedNote();
  const textVersion = useNotesStore((state) => (note ? (state.textVersions[note.id] ?? 0) : 0));
  const transcribing = useNotesStore((state) => note !== null && state.transcribingIds.includes(note.id));
  const sealed = useNotesStore((state) => note !== null && isSealed(note, state.openedIds));

  if (!note) return <EmptyNote />;
  if (sealed) return <LockScreen note={note} />;
  // A transcription replaces the text, so the editor starts over around one.
  return <NoteEditor key={`${note.id}:${textVersion}:${transcribing ? "transcribing" : "ready"}`} note={note} />;
}
