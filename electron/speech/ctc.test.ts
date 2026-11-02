import { describe, expect, it } from "vitest";
import { z } from "zod";
import { bestTokens, ctcVocabularySchema, decodeCtc } from "@main/speech/ctc";
import { readFixture } from "@main/speech/fixtures";

const fixture = readFixture(
  "ctc.json",
  z.object({
    tokens: ctcVocabularySchema,
    cases: z.array(z.object({ ids: z.array(z.number().int()), text: z.string() })),
  }),
);
const vocabulary = fixture.tokens;
const id = (token: string) => vocabulary.tokens.indexOf(token);

describe("decodeCtc", () => {
  it("gives the text Python's processor and helper give", () => {
    for (const { ids, text } of fixture.cases) expect(decodeCtc(ids, vocabulary)).toBe(text);
  });

  it("merges repeats, keeps letters a blank separates, and drops the language tag", () => {
    const [amh, sa, la, blank, space] = [id("[AMH]"), id("ሰ"), id("ላ"), vocabulary.blank, id("|")];
    expect(decodeCtc([amh, sa, sa, blank, la, la, space, space, la, blank, la], vocabulary)).toBe("ሰላ ላላ");
  });
});

describe("bestTokens", () => {
  it("takes the highest score at each step, the first on a tie", () => {
    const logits = new Float32Array([0.1, 0.9, 0.3, 0.5, 0.5, 0.2]);
    expect(bestTokens(logits, 2, 3)).toEqual([1, 0]);
  });
});
