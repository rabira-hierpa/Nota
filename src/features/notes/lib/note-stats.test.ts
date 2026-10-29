import { describe, expect, it } from "vitest";
import { noteStats } from "@/features/notes/lib/note-stats";

describe("noteStats", () => {
  it("counts an empty note as nothing", () => {
    expect(noteStats("")).toEqual({ paragraphs: 0, words: 0, characters: 0, charactersWithoutSpaces: 0 });
  });

  it("counts blocks with text as paragraphs, skipping empty lines", () => {
    expect(noteStats("የሳምንቱ ስብሰባ\n\nዛሬ ቡድኑ ተሰብስቦ ተወያየ።\nቀጣዩ ስብሰባ ሐሙስ ነው።").paragraphs).toBe(3);
  });

  it("counts each Ge'ez syllable as one character", () => {
    // ሰ ላ ም, a space, ነ ው and ።
    expect(noteStats("ሰላም ነው።")).toMatchObject({ words: 2, characters: 7, charactersWithoutSpaces: 6 });
  });

  it("joins blocks with one space, as a reader would see them", () => {
    expect(noteStats("ab\ncd")).toMatchObject({ characters: 5, charactersWithoutSpaces: 4 });
  });
});
