import { describe, expect, it } from "vitest";
import { EDITOR_FONTS, editorFontOf, FONT_GROUPS } from "@/features/notes/lib/editor-fonts";

describe("EDITOR_FONTS", () => {
  it("gives every Latin font a Ge'ez fallback so Amharic never shows boxes", () => {
    for (const option of EDITOR_FONTS.filter((each) => each.group !== "Amharic")) {
      expect(option.family).toMatch(/--font-noto-(serif-)?ethiopic/);
    }
  });

  it("has unique ids and only known groups", () => {
    expect(new Set(EDITOR_FONTS.map((option) => option.id)).size).toBe(EDITOR_FONTS.length);
    expect(EDITOR_FONTS.every((option) => FONT_GROUPS.includes(option.group))).toBe(true);
  });
});

describe("editorFontOf", () => {
  it("recognises a stored family even after the browser respaces it", () => {
    expect(editorFontOf("var( --font-lora ),var(--font-noto-serif-ethiopic),serif")?.label).toBe("Lora");
  });

  it("is null for the default font or an unknown one", () => {
    expect(editorFontOf(undefined)).toBeNull();
    expect(editorFontOf("Comic Sans MS")).toBeNull();
    expect(editorFontOf("var(--font-unknown)")).toBeNull();
  });
});
