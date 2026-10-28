import { describe, expect, it } from "vitest";
import { buildTagTree, extractTags, findTags, hasTag } from "@/features/notes/lib/tags";

describe("findTags", () => {
  it("finds Amharic, Latin and nested tags with their positions", () => {
    const text = "ስብሰባ #ስራ ዛሬ\n#Work/Meetings (#idea)";

    expect(findTags(text)).toEqual([
      { tag: "ስራ", start: 5, end: 8 },
      { tag: "work/meetings", start: 12, end: 26 },
      { tag: "idea", start: 28, end: 33 },
    ]);
  });

  it("stops at Ethiopic punctuation", () => {
    expect(extractTags("ጨርሻለሁ #ስራ።")).toEqual(["ስራ"]);
  });

  it("ignores anchors, numbers and a lone hash", () => {
    expect(extractTags("see site.com/#anchor, item #2024, a # b, C#")).toEqual([]);
  });

  it("lists each tag once, whatever its case", () => {
    expect(extractTags("#Ideas and #ideas")).toEqual(["ideas"]);
  });
});

describe("hasTag", () => {
  it("matches the tag and everything nested under it, but not lookalikes", () => {
    expect(hasTag(["work/meetings"], "work")).toBe(true);
    expect(hasTag(["work"], "work")).toBe(true);
    expect(hasTag(["workshop"], "work")).toBe(false);
  });
});

describe("buildTagTree", () => {
  it("nests tags, counts notes per branch and adds implied parents", () => {
    const tree = buildTagTree([["work/meetings", "ስራ"], ["work/meetings"], ["work/plans"]]);

    expect(tree).toEqual([
      {
        name: "work",
        path: "work",
        count: 3,
        children: [
          { name: "meetings", path: "work/meetings", count: 2, children: [] },
          { name: "plans", path: "work/plans", count: 1, children: [] },
        ],
      },
      { name: "ስራ", path: "ስራ", count: 1, children: [] },
    ]);
  });
});
