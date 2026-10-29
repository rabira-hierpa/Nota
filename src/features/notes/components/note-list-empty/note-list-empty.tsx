"use client";

import { sectionTitle } from "@/features/notes/lib/note-sections";
import type { NoteSection } from "@/features/notes/lib/note-sections";
import type { Messages } from "@/lib/i18n";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { useMessages } from "@/hooks/use-messages";

function emptyMessage(section: NoteSection, empty: Messages["list"]["empty"]): string {
  return section.kind === "tag" ? empty.tag(section.path) : empty[section.kind];
}

interface NoteListEmptyProps {
  /** A search is narrowing the list, rather than the section being empty. */
  searching: boolean;
}

/** What an empty note list says: why it is empty, and the way out. */
export function NoteListEmpty({ searching }: NoteListEmptyProps) {
  const section = useNotesStore((state) => state.section);
  const search = useNotesStore((state) => state.search);
  const showSection = useNotesStore((state) => state.showSection);
  const m = useMessages();

  return (
    <div className="px-6 py-10 text-center text-[13px] leading-5 text-muted">
      {searching ? (
        <>
          <p>
            {m.list.noMatchBefore(sectionTitle(section, m.sections))}
            <span lang="am">{search.trim()}</span>
            {m.list.noMatchAfter}
          </p>
          {section.kind === "all" ? null : (
            <button
              type="button"
              onClick={() => showSection({ kind: "all" })}
              className="mt-2 cursor-pointer font-medium text-accent-ink hover:underline"
            >
              {m.list.searchAll}
            </button>
          )}
        </>
      ) : (
        <p>{emptyMessage(section, m.list.empty)}</p>
      )}
    </div>
  );
}
