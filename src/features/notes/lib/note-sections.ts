import { firstLine, noteTitle } from "@/features/notes/lib/note-text";
import { isEmptySearch, matchesSearch } from "@/features/notes/lib/search";
import type { SearchQuery } from "@/features/notes/lib/search";
import { extractTags, hasTag } from "@/features/notes/lib/tags";
import type { Note } from "@shared/types/note";

/** The sidebar's places to look: Bear's sections plus one per tag. */
export type NoteSection =
  | { kind: "all" }
  | { kind: "today" }
  | { kind: "todo" }
  | { kind: "favorites" }
  | { kind: "untagged" }
  | { kind: "voice" }
  | { kind: "archive" }
  | { kind: "trash" }
  | { kind: "tag"; path: string };

export type FixedSectionKind = Exclude<NoteSection["kind"], "tag">;

/** How the note list is ordered (pinned notes lead either way). */
export type SortOrder = "edited" | "created" | "title";

/** A note with what filtering needs worked out once, rather than on every filter. */
export interface IndexedNote {
  note: Note;
  tags: string[];
  /** What search reads: a locked note offers only its title. */
  searchText: string;
}

export type SectionCounts = Record<FixedSectionKind, number>;

export const SORT_ORDERS: readonly SortOrder[] = ["edited", "created", "title"];

/** A checklist item left unticked (Tiptap writes `data-checked="false"`). */
const OPEN_TODO = /data-checked="false"/;

export function indexNotes(notes: readonly Note[]): IndexedNote[] {
  return notes.map((note) => {
    // A locked note's body stays out of tags and search, even while it is open.
    const searchText = note.lock ? firstLine(note.text) : note.text;
    return { note, tags: extractTags(searchText), searchText };
  });
}

/** A section's name in the interface's language (`titles` is `messages.sections`); a tag is its `#path`. */
export function sectionTitle(section: NoteSection, titles: Record<FixedSectionKind, string>): string {
  return section.kind === "tag" ? `#${section.path}` : titles[section.kind];
}

export function isSameSection(a: NoteSection, b: NoteSection): boolean {
  return a.kind === b.kind && (a.kind !== "tag" || (b.kind === "tag" && a.path === b.path));
}

function isSameDay(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  );
}

/** Notes in the Trash appear only there; archived notes only in the Archive (and the Trash). */
export function isInSection({ note, tags }: IndexedNote, section: NoteSection, now: Date = new Date()): boolean {
  if (section.kind === "trash") return note.trashedAt !== null;
  if (note.trashedAt !== null) return false;
  if (section.kind === "archive") return note.archivedAt !== null;
  if (note.archivedAt !== null) return false;
  switch (section.kind) {
    case "all":
      return true;
    case "today":
      return isSameDay(note.updatedAt, now) || isSameDay(note.createdAt, now);
    case "todo":
      return !note.lock && OPEN_TODO.test(note.content);
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

function sortKey(note: Note, section: NoteSection, sort: SortOrder): string {
  // The Trash and the Archive list what was put there last first.
  if (section.kind === "trash") return note.trashedAt ?? note.updatedAt;
  if (section.kind === "archive") return note.archivedAt ?? note.updatedAt;
  return sort === "created" ? note.createdAt : note.updatedAt;
}

function compareNotes(section: NoteSection, sort: SortOrder) {
  const pinsLead = section.kind !== "trash" && section.kind !== "archive";
  return (a: Note, b: Note) => {
    if (pinsLead && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === "title" && pinsLead) {
      const byTitle = noteTitle(a.text).localeCompare(noteTitle(b.text), undefined, { sensitivity: "base" });
      if (byTitle !== 0) return byTitle;
    }
    return sortKey(b, section, sort).localeCompare(sortKey(a, section, sort));
  };
}

/** The note list: the section's notes that match the search, pinned first, then in the chosen order. */
export function notesInSection(
  entries: readonly IndexedNote[],
  section: NoteSection,
  query: SearchQuery,
  sort: SortOrder = "edited",
  now: Date = new Date(),
): Note[] {
  const searching = !isEmptySearch(query);
  return entries
    .filter(
      (entry) =>
        isInSection(entry, section, now) && (!searching || matchesSearch(entry.searchText, entry.tags, query)),
    )
    .map((entry) => entry.note)
    .sort(compareNotes(section, sort));
}

export function countSections(entries: readonly IndexedNote[], now: Date = new Date()): SectionCounts {
  const counts: SectionCounts = {
    all: 0,
    today: 0,
    todo: 0,
    favorites: 0,
    untagged: 0,
    voice: 0,
    archive: 0,
    trash: 0,
  };
  for (const entry of entries) {
    for (const kind of Object.keys(counts) as FixedSectionKind[]) {
      if (isInSection(entry, { kind }, now)) counts[kind] += 1;
    }
  }
  return counts;
}
