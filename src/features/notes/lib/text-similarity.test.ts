import { describe, expect, it } from "vitest";
import { cosine, splitSentences, trigramVector, wordsOf } from "@/features/notes/lib/text-similarity";

describe("splitSentences", () => {
  it("ends sentences at Ethiopic and Latin marks, and at line breaks", () => {
    expect(splitSentences("ዛሬ ቡድኑ ተሰብስቦ ተወያየ።ቀጣዩ ስብሰባ ሐሙስ ነው። እንዴት ነህ?\nDone. Next")).toEqual([
      "ዛሬ ቡድኑ ተሰብስቦ ተወያየ።",
      "ቀጣዩ ስብሰባ ሐሙስ ነው።",
      "እንዴት ነህ?",
      "Done.",
      "Next",
    ]);
  });

  it("keeps a decimal point inside its sentence", () => {
    expect(splitSentences("ዋጋው 3.5 ብር ነው። ውድ ነው።")).toEqual(["ዋጋው 3.5 ብር ነው።", "ውድ ነው።"]);
  });
});

describe("wordsOf", () => {
  it("drops punctuation, Ethiopic separators and bare numbers, and lower-cases Latin", () => {
    expect(wordsOf("የላሊበላ ጉዞ፣ 2019 Trip!")).toEqual(["የላሊበላ", "ጉዞ", "trip"]);
  });
});

describe("cosine", () => {
  it("finds a word's forms alike, and unrelated words not", () => {
    const meeting = trigramVector("ስብሰባ");
    expect(cosine(meeting, trigramVector("ስብሰባውን"))).toBeGreaterThan(0.4);
    expect(cosine(meeting, trigramVector("ገበያ"))).toBe(0);
  });

  it("is 1 for the same text and 0 for empty text", () => {
    expect(cosine(trigramVector("ሰላም ነው"), trigramVector("ሰላም ነው"))).toBeCloseTo(1);
    expect(cosine(trigramVector(""), trigramVector("ሰላም"))).toBe(0);
  });
});
