import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readFixture } from "@main/speech/fixtures";
import { MODEL_FILES } from "@main/speech/model-files";
import { punctuate, sentenceEnd } from "@main/speech/punctuate";
import type { PunctuationConfig, RunWindow } from "@main/speech/punctuate";
import { UnigramTokenizer } from "@main/speech/sentencepiece";

const LABELS = ["<NULL>", "<ACRONYM>", ".", ",", "?", "？", "，", "。", "、", "・", "।", "؟", "،", ";", "።", "፣", "፧"];
const label = (mark: string) => LABELS.indexOf(mark);

/** A tokenizer where each letter a–z is one piece (ids 4–29). */
function letters(maxLength: number): PunctuationConfig {
  const pieces: [string, number][] = [["<s>", 0], ["<pad>", 0], ["</s>", 0], ["<unk>", 0]];
  for (let c = 0; c < 26; c++) pieces.push([`▁${String.fromCodePoint(97 + c)}`, -1]);
  return { maxLength, postLabels: LABELS, bos: 0, eos: 2, unk: 3, specials: 4, pieces };
}

describe("punctuate", () => {
  it("adds a full stop or question mark only where both of the model's heads end a sentence", async () => {
    const config = letters(16);
    const run: RunWindow = (ids) =>
      Promise.resolve({
        post: ids.map((_, i) => [0, label("።"), label("?"), label("፣"), label("."), label("።")][i] ?? 0),
        seg: ids.map((_, i) => (i === 1 || i === 2 || i === 3 || i === 4 ? 1 : 0)),
      });
    // Word 5 has a full stop label but no sentence boundary; word 3's comma is left out.
    expect(await punctuate("a b c d e", new UnigramTokenizer(config), config, run)).toBe("a። b? c d። e");
  });

  it("takes each word's label from the window where it sits furthest from a cut", async () => {
    // Room for 6 pieces, windows every 3: they start at 0, 3 and 6 of 12 words.
    const config = letters(8);
    const marks = ["።", "?", "<NULL>"];
    let window = 0;
    const run: RunWindow = (ids) => {
      const mark = label(marks[window++]);
      return Promise.resolve({ post: ids.map(() => mark), seg: ids.map(() => 1) });
    };
    const text = "a b c d e f g h i j k l";
    expect(await punctuate(text, new UnigramTokenizer(config), config, run)).toBe("a። b። c። d። e። f? g? h? i j k l");
  });

  it("leaves a word that already ends a sentence, and empty text, alone", async () => {
    const config = letters(16);
    const run: RunWindow = (ids) => Promise.resolve({ post: ids.map(() => label("።")), seg: ids.map(() => 1) });
    expect(await punctuate("a? b", new UnigramTokenizer(config), config, run)).toBe("a? b።");
    expect(await punctuate("  ", new UnigramTokenizer(config), config, run)).toBe("  ");
  });
});

const MODELS = path.join(import.meta.dirname, "..", "..", "models");
const built = existsSync(path.join(MODELS, MODEL_FILES.punctuation));

describe.skipIf(!built)("Punctuator (the built model)", () => {
  const fixture = readFixture(
    "punct.json",
    z.object({
      passages: z.array(z.object({ text: z.string(), post: z.array(z.number()), seg: z.array(z.number()) })),
    }),
  );

  it("labels each passage as Python did, long ones in several windows", async () => {
    const ort = await import("onnxruntime-node");
    const { Punctuator } = await import("@main/speech/recognizer");
    const punctuator = await Punctuator.load(ort, MODELS);
    for (const { text, post, seg } of fixture.passages) {
      const expected = text
        .split(" ")
        .map((word, i) => `${word}${sentenceEnd(LABELS[post[i]], seg[i] !== 0)}`)
        .join(" ");
      expect(await punctuator.punctuate(text)).toBe(expected);
    }
    await punctuator.release();
  }, 60_000);
});
