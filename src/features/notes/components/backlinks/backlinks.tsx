"use client";

import { useMemo } from "react";
import { Link03 } from "@untitledui/icons";
import { backlinksTo } from "@/features/notes/lib/note-links";
import { noteTitle } from "@/features/notes/lib/note-text";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";
import type { Note } from "@shared/types/note";

interface BacklinksProps {
  note: Note;
}

/** Notes that link here with `[[this title]]`, at the foot of the note. */
export function Backlinks({ note }: BacklinksProps) {
  const notes = useNotesStore((state) => state.notes);
  const select = useNotesStore((state) => state.select);
  const linking = useMemo(() => backlinksTo(notes, note), [notes, note]);
  const m = useMessages();

  if (linking.length === 0) return null;

  return (
    <aside aria-label={m.backlinks.title} className="mx-auto mb-16 max-w-[720px] border-t border-line pt-4" data-zen-hide>
      <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <Link03 className="size-3.5" aria-hidden />
        {m.backlinks.title}
      </h2>
      <ul className="flex flex-wrap gap-1.5">
        {linking.map((linked) => (
          <li key={linked.id}>
            <button
              type="button"
              onClick={() => void select(linked.id)}
              lang="am"
              className="cursor-pointer rounded-md bg-accent-soft px-2 py-1 font-ethiopic text-[13px] text-accent-ink hover:underline"
            >
              {noteTitle(linked.text) || m.common.untitled}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
