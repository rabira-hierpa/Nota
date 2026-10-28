"use client";

import { useEffect, useRef } from "react";
import { Edit05, Trash03 } from "@untitledui/icons";
import { IconButton } from "@/features/notes/components/icon-button";
import { NoteListItem } from "@/features/notes/components/note-list-item";
import { RecordButton } from "@/features/notes/components/record-button";
import { SearchField } from "@/features/notes/components/search-field";
import { SortSelect } from "@/features/notes/components/sort-select";
import { useLibrary, useVisibleNotes } from "@/features/notes/hooks/use-library";
import { useLoadNotes } from "@/features/notes/hooks/use-load-notes";
import { useSelectedMicrophone } from "@/features/notes/hooks/use-microphones";
import { useRecorder } from "@/features/notes/hooks/use-recorder";
import { onCommand } from "@/features/notes/lib/command-bus";
import { isEmptySearch } from "@/features/notes/lib/search";
import { sectionTitle } from "@/features/notes/lib/note-sections";
import type { NoteSection } from "@/features/notes/lib/note-sections";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import { useEngineStore } from "@/features/notes/stores/engine-store";
import { useMicrophoneStore } from "@/features/notes/stores/microphone-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";

function emptyMessage(section: NoteSection): string {
  switch (section.kind) {
    case "all":
      return "No notes yet. Write one with ⌘N, or speak one with the microphone.";
    case "today":
      return "Nothing written or changed today yet.";
    case "todo":
      return "No open checklist items. Add one with the checklist button.";
    case "archive":
      return "Archive notes you want to keep but not see every day.";
    case "favorites":
      return "Star a note to keep it here.";
    case "untagged":
      return "Every note has a tag.";
    case "voice":
      return "Notes you record with the microphone gather here.";
    case "trash":
      return "The Trash is empty.";
    case "tag":
      return `No notes are tagged #${section.path}.`;
  }
}

/** Middle column: the section's notes, newest first, with search and the ways to start a note. */
export function NoteList() {
  useLoadNotes();
  const { notes, query } = useVisibleNotes();
  const load = useNotesStore((state) => state.load);
  const loadNotes = useNotesStore((state) => state.loadNotes);
  const section = useNotesStore((state) => state.section);
  const search = useNotesStore((state) => state.search);
  const showSection = useNotesStore((state) => state.showSection);
  const createNote = useNotesStore((state) => state.createNote);
  const createVoiceNote = useNotesStore((state) => state.createVoiceNote);
  const emptyTrash = useNotesStore((state) => state.emptyTrash);
  const prepareModel = useEngineStore((state) => state.prepare);
  const dictating = useDictationStore((state) => state.state.kind !== "idle" && state.state.kind !== "error");
  const setRecording = useMicrophoneStore((state) => state.setRecording);
  const recorder = useRecorder(useSelectedMicrophone(), createVoiceNote);
  const trashed = useLibrary().counts.trash;
  const inTrash = section.kind === "trash";
  const searching = !isEmptySearch(query);
  const recording = recorder.state.kind !== "idle" && recorder.state.kind !== "error";

  // Dictation shares the microphone; it waits while a voice note records.
  useEffect(() => setRecording(recording), [recording, setRecording]);

  // ⌘⇧R starts a voice note, and stops it again.
  const latest = useRef({ recorder, dictating, prepareModel });
  useEffect(() => {
    latest.current = { recorder, dictating, prepareModel };
  });
  useEffect(
    () =>
      onCommand("recordVoiceNote", () => {
        const current = latest.current;
        if (current.recorder.state.kind === "recording") current.recorder.stop();
        else if (current.recorder.state.kind === "idle" || current.recorder.state.kind === "error") {
          if (current.dictating) return;
          current.prepareModel();
          void current.recorder.start();
        }
      }),
    [],
  );

  const confirmEmptyTrash = () => {
    // Every note in the Trash goes, not only those the search shows.
    const which = trashed === 1 ? "the note in the Trash" : `all ${trashed} notes in the Trash`;
    if (window.confirm(`Delete ${which} for good? This can't be undone.`)) void emptyTrash();
  };

  return (
    <section aria-label="Notes" data-pane="list" className="flex min-h-0 flex-col border-r border-line bg-list">
      <header className="drag-region shrink-0 space-y-2.5 px-4 pb-3 pt-3.5">
        <div className="flex h-8 items-center gap-1">
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
            {sectionTitle(section)}
            <span className="ml-2 text-xs font-medium tabular-nums text-muted">{notes.length}</span>
          </h1>
          {inTrash ? (
            <IconButton label="Empty Trash" onClick={confirmEmptyTrash} disabled={trashed === 0} tone="danger">
              <Trash03 className="size-4" />
            </IconButton>
          ) : (
            <>
              <RecordButton
                state={recorder.state}
                disabled={dictating}
                onStart={() => {
                  prepareModel();
                  void recorder.start();
                }}
                onStop={recorder.stop}
              />
              <IconButton label="New note (⌘N)" onClick={() => void createNote()}>
                <Edit05 className="size-4" />
              </IconButton>
            </>
          )}
        </div>
        {recorder.state.kind === "error" ? (
          <p role="alert" className="no-drag text-xs leading-5 text-accent-ink">
            {recorder.state.message}
          </p>
        ) : null}
        <SearchField />
        {inTrash ? null : (
          <div className="-mb-1 flex justify-end">
            <SortSelect />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {load.kind === "error" ? (
          <div role="alert" className="px-5 py-8 text-center text-[13px] leading-5 text-muted">
            <p>{load.message}</p>
            <button type="button" onClick={() => void loadNotes()} className="mt-2 cursor-pointer font-medium text-accent-ink hover:underline">
              Try again
            </button>
          </div>
        ) : null}
        {load.kind === "ready" && notes.length === 0 ? (
          <div className="px-6 py-10 text-center text-[13px] leading-5 text-muted">
            {searching ? (
              <>
                <p>
                  Nothing in {sectionTitle(section)} matches “<span lang="am">{search.trim()}</span>”.
                </p>
                {section.kind === "all" ? null : (
                  <button
                    type="button"
                    onClick={() => showSection({ kind: "all" })}
                    className="mt-2 cursor-pointer font-medium text-accent-ink hover:underline"
                  >
                    Search all notes
                  </button>
                )}
              </>
            ) : (
              <p>{emptyMessage(section)}</p>
            )}
          </div>
        ) : null}
        <ul aria-label={`${sectionTitle(section)} notes`}>
          {notes.map((note) => (
            <NoteListItem key={note.id} note={note} terms={query.terms} />
          ))}
        </ul>
      </div>
    </section>
  );
}
