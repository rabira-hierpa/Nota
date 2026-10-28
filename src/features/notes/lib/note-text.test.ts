import { describe, expect, it } from "vitest";
import { notePreview, noteTitle, wordCount } from "@/features/notes/lib/note-text";

describe("noteTitle and notePreview", () => {
  const text = "\n  የስብሰባ ማስታወሻ \n\nዛሬ ከሰዓት\nበ #ስራ ቢሮ  ";

  it("takes the first line as the title", () => {
    expect(noteTitle(text)).toBe("የስብሰባ ማስታወሻ");
  });

  it("flattens the rest into the preview", () => {
    expect(notePreview(text)).toBe("ዛሬ ከሰዓት በ #ስራ ቢሮ");
  });

  it("cuts a long first line, like a transcript, into a title and a preview", () => {
    const transcript = `${"ሰላም ዓለም ".repeat(6)}ይህ ረጅም ነው። ${"ቀጣዩ ዓረፍተ ነገር ".repeat(6)}`;

    expect(noteTitle(transcript)).toBe(`${"ሰላም ዓለም ".repeat(6)}ይህ ረጅም ነው።`);
    expect(notePreview(transcript)).toBe("ቀጣዩ ዓረፍተ ነገር ".repeat(6).trim());
    expect(noteTitle("ሀ".repeat(100))).toBe(`${"ሀ".repeat(80)}…`);
  });

  it("is empty for an empty note", () => {
    expect(noteTitle("  \n")).toBe("");
    expect(notePreview("only a title")).toBe("");
  });
});

describe("wordCount", () => {
  it("counts words split by spaces or the Ge'ez separator", () => {
    expect(wordCount("ሰላም ዓለም፡እንዴት\nነህ")).toBe(4);
    expect(wordCount("   ")).toBe(0);
  });
});
