"use client";

import { Edit05 } from "@untitledui/icons";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";

/** The editor column when no note is open. */
export function EmptyNote() {
  const createNote = useNotesStore((state) => state.createNote);
  const loading = useNotesStore((state) => state.load.kind !== "ready" && state.load.kind !== "error");
  const m = useMessages();

  return (
    <main className="flex min-h-0 flex-col bg-paper">
      <div className="drag-region h-13 shrink-0" />
      {loading ? null : (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
          <p lang="am" className="font-ethiopic text-2xl font-semibold text-ink">
            ማስታወሻ ይጻፉ
          </p>
          <p className="mt-2 max-w-sm text-[13px] leading-6 text-muted">
            {m.emptyNote.body}
          </p>
          <button
            type="button"
            onClick={() => void createNote()}
            className="mt-5 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 text-[13px] font-semibold text-on-accent shadow-sm transition-opacity duration-150 hover:opacity-90"
          >
            <Edit05 className="size-4" aria-hidden />
            {m.emptyNote.newNote}
            <kbd className="ml-1 font-sans text-xs text-on-accent/80">⌘N</kbd>
          </button>
        </div>
      )}
    </main>
  );
}
