import { describe, expect, it } from "vitest";
import { backlinksTo, findLinkedNote, findLinks } from "@/features/notes/lib/note-links";
import type { Note } from "@shared/types/note";

function note(id: string, text: string, fields: Partial<Note> = {}): Note {
  return {
    id,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    content: "",
    text,
    favorite: false,
    pinned: false,
    archivedAt: null,
    trashedAt: null,
    audio: null,
    lock: null,
    ...fields,
  };
}

describe("findLinks", () => {
  it("finds [[titles]] with their positions, in Amharic too", () => {
    expect(findLinks("ይመልከቱ [[የስብሰባ ማስታወሻ]] እና [[ Plan ]]")).toEqual([
      { title: "የስብሰባ ማስታወሻ", start: 6, end: 21 },
      { title: "Plan", start: 25, end: 35 },
    ]);
  });

  it("ignores empty brackets and links across lines", () => {
    expect(findLinks("[[]] and [[half\nway]]")).toEqual([]);
  });
});

describe("findLinkedNote and backlinksTo", () => {
  const meeting = note("meeting", "የስብሰባ ማስታወሻ\nዛሬ");
  const plan = note("plan", "Plan\nsee [[የስብሰባ ማስታወሻ]]");
  const locked = note("locked", "Secret\n[[የስብሰባ ማስታወሻ]]", { lock: { body: "x" } });
  const binned = note("binned", "Old\n[[የስብሰባ ማስታወሻ]]", { trashedAt: "2026-10-02T09:00:00.000Z" });
  const notes = [meeting, plan, locked, binned];

  it("opens the note whose first line is the title, ignoring case and space", () => {
    expect(findLinkedNote(notes, " plan ")?.id).toBe("plan");
    expect(findLinkedNote(notes, "Nowhere")).toBeUndefined();
  });

  it("lists the notes that link here, leaving out locked and trashed ones", () => {
    expect(backlinksTo(notes, meeting).map((each) => each.id)).toEqual(["plan"]);
    expect(backlinksTo(notes, note("empty", ""))).toEqual([]);
  });
});
