import { firstLine } from "@/features/notes/lib/note-text";
import type { Note } from "@shared/types/note";

/** Bear-style links: `[[Another note's title]]`, on one line. */
const LINK_PATTERN = /\[\[([^[\]\n]{1,200})\]\]/g;

export interface LinkMatch {
  /** The title as written between the brackets, trimmed. */
  title: string;
  /** Offsets of `[[…]]` in the text, brackets included. */
  start: number;
  end: number;
}

/** Titles compare without case or surrounding space. */
export function linkKey(title: string): string {
  return title.trim().toLowerCase();
}

export function findLinks(text: string): LinkMatch[] {
  return [...text.matchAll(LINK_PATTERN)].flatMap((match) => {
    const title = (match[1] ?? "").trim();
    const start = match.index ?? 0;
    return title ? [{ title, start, end: start + match[0].length }] : [];
  });
}

/** The note a link points at: the newest one outside the Trash whose first line is that title. */
export function findLinkedNote(notes: readonly Note[], title: string): Note | undefined {
  const key = linkKey(title);
  return notes
    .filter((note) => note.trashedAt === null && linkKey(firstLine(note.text)) === key)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/** Notes that link to this one by its title (locked notes keep their links to themselves). */
export function backlinksTo(notes: readonly Note[], target: Note): Note[] {
  const key = linkKey(firstLine(target.text));
  if (!key) return [];
  return notes.filter(
    (note) =>
      note.id !== target.id &&
      note.trashedAt === null &&
      !note.lock &&
      findLinks(note.text).some((link) => linkKey(link.title) === key),
  );
}
