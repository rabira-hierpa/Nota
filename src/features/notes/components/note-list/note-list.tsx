"use client";

import { Edit05, LayoutLeft, Recording02, Trash03 } from "@untitledui/icons";
import { IconButton } from "@/features/notes/components/icon-button";
import { NoteListEmpty } from "@/features/notes/components/note-list-empty";
import { NoteListItem } from "@/features/notes/components/note-list-item";
import { RecordButton } from "@/features/notes/components/record-button";
import { SearchField } from "@/features/notes/components/search-field";
import { SortSelect } from "@/features/notes/components/sort-select";
import { useLibrary, useVisibleNotes } from "@/features/notes/hooks/use-library";
import { useLoadNotes } from "@/features/notes/hooks/use-load-notes";
import { useNoteCapture } from "@/features/notes/hooks/use-note-capture";
import { isEmptySearch } from "@/features/notes/lib/search";
import { sectionTitle } from "@/features/notes/lib/note-sections";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useViewStore } from "@/features/notes/stores/view-store";
import { useMessages } from "@/hooks/use-messages";

/**
 * Middle column: the section's notes, newest first, with search and the ways
 * to start a note: write one, record one, or transcribe a recording made
 * elsewhere (the button, ⌘⇧O, or dropping the file on the list).
 */
export function NoteList() {
  useLoadNotes();
  const { notes, query } = useVisibleNotes();
  const load = useNotesStore((state) => state.load);
  const loadNotes = useNotesStore((state) => state.loadNotes);
  const section = useNotesStore((state) => state.section);
  const createNote = useNotesStore((state) => state.createNote);
  const emptyTrash = useNotesStore((state) => state.emptyTrash);
  const { recorder, importer, dictating, prepareModel, drop, error } = useNoteCapture();
  const trashed = useLibrary().counts.trash;
  const sidebarHidden = useViewStore((state) => state.sidebarHidden);
  const setSidebarHidden = useViewStore((state) => state.setSidebarHidden);
  const inTrash = section.kind === "trash";
  const searching = !isEmptySearch(query);
  const converting = importer.state.kind === "converting";
  const m = useMessages();
  const title = sectionTitle(section, m.sections);

  const confirmEmptyTrash = () => {
    // Every note in the Trash goes, not only those the search shows.
    if (window.confirm(m.list.confirmEmptyTrash(trashed))) void emptyTrash();
  };

  return (
    <section
      aria-label={m.list.region}
      data-pane="list"
      {...drop.dropHandlers}
      className="relative flex min-h-0 flex-col border-r border-line bg-list"
    >
      <header className="drag-region shrink-0 space-y-2.5 px-4 pb-3 pt-3.5">
        {/* Only this row sits level with a Mac's traffic lights, once the sidebar is folded away. */}
        <div data-corner="list" className="flex h-8 items-center gap-1">
          {sidebarHidden ? (
            <IconButton label={m.sidebar.show} onClick={() => setSidebarHidden(false)} className="-ml-1.5 mr-0.5">
              <LayoutLeft className="size-4" />
            </IconButton>
          ) : null}
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
            {title}
            <span className="ml-2 text-xs font-medium tabular-nums text-muted">{notes.length}</span>
          </h1>
          {inTrash ? (
            <IconButton label={m.list.emptyTrash} onClick={confirmEmptyTrash} disabled={trashed === 0} tone="danger">
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
              <IconButton
                label={converting ? m.list.readingRecording : m.list.transcribeRecording}
                onClick={() => void importer.choose()}
                disabled={converting}
                className={converting ? "animate-pulse disabled:cursor-progress" : undefined}
              >
                <Recording02 className="size-4" />
              </IconButton>
              <IconButton label={m.list.newNote} onClick={() => void createNote()}>
                <Edit05 className="size-4" />
              </IconButton>
            </>
          )}
        </div>
        {error ? (
          <p role="alert" className="no-drag text-xs leading-5 text-accent-ink">
            {m.translate(error)}
          </p>
        ) : null}
        <div className="flex items-center gap-1.5">
          <SearchField />
          {inTrash ? null : <SortSelect />}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {load.kind === "error" ? (
          <div role="alert" className="px-5 py-8 text-center text-[13px] leading-5 text-muted">
            <p>{m.translate(load.message)}</p>
            <button type="button" onClick={() => void loadNotes()} className="mt-2 cursor-pointer font-medium text-accent-ink hover:underline">
              {m.common.tryAgain}
            </button>
          </div>
        ) : null}
        {load.kind === "ready" && notes.length === 0 ? <NoteListEmpty searching={searching} /> : null}
        <ul aria-label={m.list.notesIn(title)}>
          {notes.map((note) => (
            <NoteListItem key={note.id} note={note} terms={query.terms} />
          ))}
        </ul>
      </div>
      {drop.over ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-accent-soft/80 text-center text-[13px] font-semibold text-accent-ink"
        >
          <Recording02 className="size-6" />
          {m.list.dropRecording}
        </div>
      ) : null}
    </section>
  );
}
