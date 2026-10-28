import { describe, expect, it } from "vitest";
import { countSections, indexNotes, isSameSection, notesInSection, sectionTitle } from "@/features/notes/lib/note-sections";
import { parseSearch } from "@/features/notes/lib/search";
import type { Note } from "@shared/types/note";

function note(id: string, fields: Partial<Note>): Note {
  return {
    id,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    content: "",
    text: "",
    favorite: false,
    pinned: false,
    archivedAt: null,
    trashedAt: null,
    audio: null,
    lock: null,
    ...fields,
  };
}

const meeting = note("meeting", { text: "ስብሰባ #work/meetings", updatedAt: "2026-10-03T09:00:00.000Z", favorite: true });
const idea = note("idea", { text: "Launch idea", updatedAt: "2026-10-04T09:00:00.000Z" });
const voice = note("voice", {
  text: "ሙከራ #ስራ",
  updatedAt: "2026-10-02T09:00:00.000Z",
  audio: { durationMs: 1000, transcription: { status: "pending" } },
});
const binned = note("binned", {
  text: "old #work",
  favorite: true,
  trashedAt: "2026-10-05T09:00:00.000Z",
  updatedAt: "2026-09-01T09:00:00.000Z",
});
const entries = indexNotes([meeting, idea, voice, binned]);
const noSearch = parseSearch("");

function ids(notes: Note[]): string[] {
  return notes.map((each) => each.id);
}

describe("notesInSection", () => {
  it("lists everything outside the Trash, most recently edited first", () => {
    expect(ids(notesInSection(entries, { kind: "all" }, noSearch))).toEqual(["idea", "meeting", "voice"]);
  });

  it("keeps trashed notes out of every other section, favourites included", () => {
    expect(ids(notesInSection(entries, { kind: "favorites" }, noSearch))).toEqual(["meeting"]);
    expect(ids(notesInSection(entries, { kind: "tag", path: "work" }, noSearch))).toEqual(["meeting"]);
    expect(ids(notesInSection(entries, { kind: "trash" }, noSearch))).toEqual(["binned"]);
  });

  it("finds untagged and voice notes", () => {
    expect(ids(notesInSection(entries, { kind: "untagged" }, noSearch))).toEqual(["idea"]);
    expect(ids(notesInSection(entries, { kind: "voice" }, noSearch))).toEqual(["voice"]);
  });

  it("narrows a section by the search", () => {
    expect(ids(notesInSection(entries, { kind: "all" }, parseSearch("ሙከራ")))).toEqual(["voice"]);
    expect(ids(notesInSection(entries, { kind: "all" }, parseSearch("#ስራ")))).toEqual(["voice"]);
  });
});

describe("countSections", () => {
  it("counts each section the way it lists", () => {
    expect(countSections(entries)).toEqual({ all: 3, favorites: 1, untagged: 1, voice: 1, trash: 1 });
  });
});

describe("sections", () => {
  it("titles tags with their hash and compares tag paths", () => {
    expect(sectionTitle({ kind: "tag", path: "ስራ" })).toBe("#ስራ");
    expect(sectionTitle({ kind: "favorites" })).toBe("Favorites");
    expect(isSameSection({ kind: "tag", path: "a" }, { kind: "tag", path: "a" })).toBe(true);
    expect(isSameSection({ kind: "tag", path: "a" }, { kind: "tag", path: "b" })).toBe(false);
    expect(isSameSection({ kind: "all" }, { kind: "trash" })).toBe(false);
  });
});
