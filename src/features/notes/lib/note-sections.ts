import { isEmptySearch, matchesSearch } from "@/features/notes/lib/search";
import type { SearchQuery } from "@/features/notes/lib/search";
import { extractTags, hasTag } from "@/features/notes/lib/tags";
import type { Note } from "@shared/types/note";

/** The sidebar's places to look: Bear's sections plus one per tag. */
export type NoteSection =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "untagged" }
  | { kind: "voice" }
  | { kind: "trash" }
  | { kind: "tag"; path: string };

export type FixedSectionKind = Exclude<NoteSection["kind"], "tag">;

/** A note with its tags worked out once, rather than on every filter. */
export interface IndexedNote {
  note: Note;
  tags: string[];
}

export type SectionCounts = Record<FixedSectionKind, number>;

export const SECTION_TITLES: Record<FixedSectionKind, string> = {
  all: "Notes",
  favorites: "Favorites",
  untagged: "Untagged",
  voice: "Voice notes",
  trash: "Trash",
};

export function indexNotes(notes: readonly Note[]): IndexedNote[] {
  return notes.map((note) => ({ note, tags: extractTags(note.text) }));
}

export function sectionTitle(section: NoteSection): string {
  return section.kind === "tag" ? `#${section.path}` : SECTION_TITLES[section.kind];
}

export function isSameSection(a: NoteSection, b: NoteSection): boolean {
  return a.kind === b.kind && (a.kind !== "tag" || (b.kind === "tag" && a.path === b.path));
}

/** Notes in the Trash appear only in the Trash. */
export function isInSection({ note, tags }: IndexedNote, section: NoteSection): boolean {
  if (section.kind === "trash") return note.trashedAt !== null;
  if (note.trashedAt !== null) return false;
  switch (section.kind) {
    case "all":
      return true;
    case "favorites":
      return note.favorite;
    case "untagged":
      return tags.length === 0;
    case "voice":
      return note.audio !== null;
    case "tag":
      return hasTag(tags, section.path);
  }
}

function byRecency(section: NoteSection) {
  // The Trash lists what was thrown away last first; everywhere else, what was edited last.
  const at = (note: Note) => (section.kind === "trash" ? (note.trashedAt ?? note.updatedAt) : note.updatedAt);
  return (a: IndexedNote, b: IndexedNote) => at(b.note).localeCompare(at(a.note));
}

/** The note list: the section's notes that match the search, newest first. */
export function notesInSection(entries: readonly IndexedNote[], section: NoteSection, query: SearchQuery): Note[] {
  const searching = !isEmptySearch(query);
  return entries
    .filter((entry) => isInSection(entry, section) && (!searching || matchesSearch(entry.note.text, entry.tags, query)))
    .sort(byRecency(section))
    .map((entry) => entry.note);
}

export function countSections(entries: readonly IndexedNote[]): SectionCounts {
  const counts: SectionCounts = { all: 0, favorites: 0, untagged: 0, voice: 0, trash: 0 };
  for (const entry of entries) {
    for (const kind of Object.keys(counts) as FixedSectionKind[]) {
      if (isInSection(entry, { kind })) counts[kind] += 1;
    }
  }
  return counts;
}
