import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readFixture } from "@main/speech/fixtures";
import { UnigramTokenizer } from "@main/speech/sentencepiece";

const fixture = readFixture(
  "punct.json",
  z.object({
    table: z.object({ pieces: z.array(z.tuple([z.string(), z.number()])), specials: z.number(), unk: z.number() }),
    words: z.array(z.tuple([z.string(), z.array(z.number().int())])),
  }),
);

describe("UnigramTokenizer", () => {
  const tokenizer = new UnigramTokenizer(fixture.table);

  it("cuts words as SentencePiece does with the kept pieces only", () => {
    const wrong = fixture.words.filter(([word, ids]) => JSON.stringify(tokenizer.encodeWord(word)) !== JSON.stringify(ids));
    expect(wrong.map(([word]) => word)).toEqual([]);
    expect(fixture.words.length).toBeGreaterThan(500);
  });

  it("gives a run of characters no piece covers one unknown id", () => {
    const ids = tokenizer.encodeWord("中文");
    expect(ids.filter((piece) => piece === fixture.table.unk)).toHaveLength(1);
  });
});
