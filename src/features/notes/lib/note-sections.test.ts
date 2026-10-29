import { describe, expect, it } from "vitest";
import { countSections, indexNotes, isSameSection, notesInSection, sectionTitle } from "@/features/notes/lib/note-sections";
import { am } from "@/lib/i18n/am";
import { en } from "@/lib/i18n/en";
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
    expect(countSections(entries, new Date("2026-12-01T12:00:00.000Z"))).toEqual({
      all: 3,
      today: 0,
      todo: 0,
      favorites: 1,
      untagged: 1,
      voice: 1,
      archive: 0,
      trash: 1,
    });
  });
});

describe("Bear's other sections and ordering", () => {
  const now = new Date(2026, 9, 29, 12, 0);
  const todayNote = note("today", { text: "fresh", updatedAt: new Date(2026, 9, 29, 9, 0).toISOString() });
  const todoNote = note("todo", { text: "list", content: '<ul data-type="taskList"><li data-checked="false"><p>buy</p></li></ul>' });
  const doneNote = note("done", { text: "done", content: '<ul data-type="taskList"><li data-checked="true"><p>x</p></li></ul>' });
  const archived = note("archived", { text: "kept #work", archivedAt: "2026-10-05T09:00:00.000Z" });
  const pinned = note("pinned", { text: "Pinned", pinned: true, updatedAt: "2026-09-01T09:00:00.000Z" });
  const locked = note("locked", { text: "Diary\nsecret #private", lock: { body: "sealed" } });
  const more = indexNotes([todayNote, todoNote, doneNote, archived, pinned, locked]);

  it("finds today's notes and notes with open checklist items", () => {
    expect(ids(notesInSection(more, { kind: "today" }, noSearch, "edited", now))).toEqual(["today"]);
    expect(ids(notesInSection(more, { kind: "todo" }, noSearch, "edited", now))).toEqual(["todo"]);
  });

  it("keeps archived notes out of everything but the Archive", () => {
    expect(ids(notesInSection(more, { kind: "archive" }, noSearch, "edited", now))).toEqual(["archived"]);
    expect(ids(notesInSection(more, { kind: "tag", path: "work" }, noSearch, "edited", now))).toEqual([]);
  });

  it("puts pinned notes first, then follows the chosen order", () => {
    expect(ids(notesInSection(more, { kind: "all" }, noSearch, "edited", now))[0]).toBe("pinned");
    // Titles A–Z after the pin: Diary, done, fresh, list.
    expect(ids(notesInSection(more, { kind: "all" }, noSearch, "title", now))).toEqual([
      "pinned",
      "locked",
      "done",
      "today",
      "todo",
    ]);
  });

  it("keeps a locked note's body out of tags and search", () => {
    expect(ids(notesInSection(more, { kind: "tag", path: "private" }, noSearch, "edited", now))).toEqual([]);
    expect(ids(notesInSection(more, { kind: "all" }, parseSearch("secret"), "edited", now))).toEqual([]);
    expect(ids(notesInSection(more, { kind: "all" }, parseSearch("diary"), "edited", now))).toEqual(["locked"]);
  });
});

describe("sections", () => {
  it("titles tags with their hash and compares tag paths", () => {
    expect(sectionTitle({ kind: "tag", path: "ስራ" }, en.sections)).toBe("#ስራ");
    expect(sectionTitle({ kind: "favorites" }, en.sections)).toBe("Favorites");
    expect(sectionTitle({ kind: "favorites" }, am.sections)).toBe("ተወዳጆች");
    expect(isSameSection({ kind: "tag", path: "a" }, { kind: "tag", path: "a" })).toBe(true);
    expect(isSameSection({ kind: "tag", path: "a" }, { kind: "tag", path: "b" })).toBe(false);
    expect(isSameSection({ kind: "all" }, { kind: "trash" })).toBe(false);
  });
});
