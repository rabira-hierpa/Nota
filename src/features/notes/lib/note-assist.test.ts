import { describe, expect, it } from "vitest";
import { splitIntoParagraphs } from "@/features/notes/lib/split-paragraphs";
import { suggestTags } from "@/features/notes/lib/suggest-tags";
import type { TaggedText } from "@/features/notes/lib/suggest-tags";
import { summarize } from "@/features/notes/lib/summarize";
import { extractTags } from "@/features/notes/lib/tags";

// A meeting transcript: four sentences about the app, then three about the budget.
const APP = [
  "ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ።",
  "መተግበሪያው የአማርኛ ድምፅን ወደ ጽሑፍ ይቀይራል።",
  "ቡድኑ መተግበሪያውን በሚቀጥለው ወር ለመልቀቅ ወሰነ።",
  "የመተግበሪያው ዲዛይን ቀላል እና ንጹህ መሆን አለበት።",
];
const BUDGET = ["በስብሰባው ላይ የበጀት ጉዳይም ተነስቷል።", "በጀቱ ለሶስት ወር በቂ ነው።", "ተጨማሪ በጀት ለማግኘት ማመልከቻ እንጽፋለን።"];
const TRANSCRIPT = [...APP, ...BUDGET].join(" ");
const MEETING = `የሳምንቱ ስብሰባ\n${TRANSCRIPT}`;

function library(...texts: string[]): TaggedText[] {
  return texts.map((text, index) => ({ id: `note-${index}`, text, tags: extractTags(text) }));
}

describe("summarize", () => {
  it("picks whole sentences of the note, in order, leaving out the title", () => {
    const summary = summarize(`${MEETING}\n#ስራ`);
    expect(summary.length).toBeGreaterThanOrEqual(1);
    expect(summary.length).toBeLessThanOrEqual(2);
    for (const sentence of summary) expect([...APP, ...BUDGET]).toContain(sentence);
    expect(summary).toEqual([...summary].sort((a, b) => TRANSCRIPT.indexOf(a) - TRANSCRIPT.indexOf(b)));
  });

  it("finds the sentences about what most of the note is about", () => {
    expect(summarize(MEETING).some((sentence) => APP.includes(sentence))).toBe(true);
  });

  it("has nothing to say about a short note", () => {
    expect(summarize("የገበያ ዝርዝር\nቲማቲም እና ሽንኩርት ግዛ።")).toEqual([]);
  });
});

describe("splitIntoParagraphs", () => {
  it("cuts a transcript where the topic changes", () => {
    expect(splitIntoParagraphs(TRANSCRIPT)).toEqual([APP.join(" "), BUDGET.join(" ")]);
  });

  it("leaves a short paragraph alone", () => {
    expect(splitIntoParagraphs(APP.join(" "))).toEqual([APP.join(" ")]);
  });

  it("keeps every sentence, in order", () => {
    const long = Array.from({ length: 3 }, () => TRANSCRIPT).join(" ");
    expect(splitIntoParagraphs(long).join(" ")).toBe(long);
  });
});

describe("suggestTags", () => {
  const notes = library(
    "የቡድን ስብሰባ\nቡድኑ ስለ መተግበሪያው ዲዛይን ተወያየ። ቀጣዩ ስብሰባ ሰኞ ነው። #ስራ/ስብሰባ",
    "የስራ እቅድ\nበዚህ ሳምንት የመተግበሪያውን ዲዛይን እንጨርሳለን። ሙከራ እንጀምራለን። #ስራ",
    "የገበያ ዝርዝር\nቲማቲም፣ ሽንኩርት፣ ዘይት፣ ጤፍ። ገበያ ቅዳሜ። #ቤት",
    "የላሊበላ ጉዞ\nበላሊበላ አብያተ ክርስቲያናትን ጎበኘን። ጉዞው ረጅም ነበር ግን ቆንጆ ነበር። #ጉዞ",
  );

  it("offers the tag that notes like this one carry, nested tag rather than its parent", () => {
    const tags = suggestTags({ id: "new", text: MEETING }, notes);
    expect(tags[0]).toEqual({ tag: "ስራ/ስብሰባ", source: "library" });
    expect(tags.map(({ tag }) => tag)).not.toContain("ስራ");
    expect(tags.map(({ tag }) => tag)).not.toContain("ጉዞ");
  });

  it("offers words the note keeps coming back to, in their plain form", () => {
    const tags = suggestTags({ id: "new", text: MEETING }, notes);
    expect(tags).toContainEqual({ tag: "መተግበሪያ", source: "keyword" });
    expect(tags).toContainEqual({ tag: "በጀት", source: "keyword" });
  });

  it("never offers a tag the note already has, or a common word", () => {
    const tags = suggestTags({ id: "new", text: `${MEETING}\n#ስራ/ስብሰባ` }, notes).map(({ tag }) => tag);
    expect(tags).not.toContain("ስራ/ስብሰባ");
    expect(tags).not.toContain("ወር");
  });
});
