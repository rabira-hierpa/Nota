"use client";

import { useMemo } from "react";
import { countSections, indexNotes, notesInSection } from "@/features/notes/lib/note-sections";
import type { IndexedNote, SectionCounts } from "@/features/notes/lib/note-sections";
import { parseSearch } from "@/features/notes/lib/search";
import type { SearchQuery } from "@/features/notes/lib/search";
import { buildTagTree } from "@/features/notes/lib/tags";
import type { TagNode } from "@/features/notes/lib/tags";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import type { Note } from "@shared/types/note";

/** Every note with its tags, recomputed only when the notes change. */
function useIndexedNotes(): IndexedNote[] {
  const notes = useNotesStore((state) => state.notes);
  return useMemo(() => indexNotes(notes), [notes]);
}

/** The sidebar: how many notes each section holds, and the tag tree (Trash excluded). */
export function useLibrary(): { counts: SectionCounts; tags: TagNode[] } {
  const entries = useIndexedNotes();
  return useMemo(
    () => ({
      counts: countSections(entries),
      tags: buildTagTree(entries.filter(({ note }) => note.trashedAt === null).map(({ tags }) => tags)),
    }),
    [entries],
  );
}

/** The note list: the current section, narrowed by the search, newest first. */
export function useVisibleNotes(): { notes: Note[]; query: SearchQuery } {
  const entries = useIndexedNotes();
  const section = useNotesStore((state) => state.section);
  const search = useNotesStore((state) => state.search);
  return useMemo(() => {
    const query = parseSearch(search);
    return { notes: notesInSection(entries, section, query), query };
  }, [entries, section, search]);
}

export function useSelectedNote(): Note | null {
  return useNotesStore((state) => state.notes.find((note) => note.id === state.selectedId) ?? null);
}
