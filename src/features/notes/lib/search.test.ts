import { describe, expect, it } from "vitest";
import { highlightParts, isEmptySearch, matchesSearch, parseSearch } from "@/features/notes/lib/search";

describe("parseSearch", () => {
  it("separates words from #tags", () => {
    expect(parseSearch("  ስብሰባ #Work  Plan ")).toEqual({ terms: ["ስብሰባ", "plan"], tags: ["work"] });
  });

  it("treats a lone # as a word and nothing as empty", () => {
    expect(parseSearch("#")).toEqual({ terms: ["#"], tags: [] });
    expect(isEmptySearch(parseSearch("   "))).toBe(true);
  });
});

describe("matchesSearch", () => {
  const text = "ስብሰባ ዛሬ ከሰዓት\nPlan the launch";

  it("needs every word, in any case and order", () => {
    expect(matchesSearch(text, [], parseSearch("launch ስብሰባ"))).toBe(true);
    expect(matchesSearch(text, [], parseSearch("launch ነገ"))).toBe(false);
  });

  it("matches a tag and its nested tags", () => {
    expect(matchesSearch(text, ["work/meetings"], parseSearch("#work"))).toBe(true);
    expect(matchesSearch(text, ["home"], parseSearch("#work"))).toBe(false);
  });
});

describe("highlightParts", () => {
  it("marks each occurrence, merging overlaps", () => {
    expect(highlightParts("Plan a planet", ["plan", "lane"])).toEqual([
      { text: "Plan", match: true },
      { text: " a ", match: false },
      { text: "plane", match: true },
      { text: "t", match: false },
    ]);
  });

  it("highlights Amharic", () => {
    expect(highlightParts("ሰላም ዓለም", ["ዓለም"])).toEqual([
      { text: "ሰላም ", match: false },
      { text: "ዓለም", match: true },
    ]);
  });

  it("returns the text whole when nothing is searched", () => {
    expect(highlightParts("ሰላም", [])).toEqual([{ text: "ሰላም", match: false }]);
  });
});
