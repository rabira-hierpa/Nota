import { z } from "zod";

/** models/hohe.json: Hohe's CTC tokens by id. */
export const ctcVocabularySchema = z.object({
  tokens: z.array(z.string()).min(1),
  blank: z.number().int().nonnegative(),
  wordDelimiter: z.string(),
});
export type CtcVocabulary = z.infer<typeof ctcVocabularySchema>;

/** Language tags such as [AMH], which Hohe writes at the start of its text. */
const LANGUAGE_TAG = /\[[A-Z]+\]/g;

/** The most likely token at each step (the first on a tie, as numpy's argmax). */
export function bestTokens(logits: Float32Array, steps: number, size: number): number[] {
  const ids: number[] = [];
  for (let t = 0; t < steps; t++) {
    const row = t * size;
    let best = 0;
    for (let v = 1; v < size; v++) if (logits[row + v] > logits[row + best]) best = v;
    ids.push(best);
  }
  return ids;
}

/**
 * Greedy CTC: repeats merged, blanks dropped, the word delimiter read as a
 * space, language tags removed. The same text as `processor.batch_decode`
 * plus the clean-up in electron/python/amharic_transcriber.py.
 */
export function decodeCtc(ids: readonly number[], vocabulary: CtcVocabulary): string {
  const blank = vocabulary.tokens[vocabulary.blank];
  let text = "";
  let previous: string | undefined;
  for (const id of ids) {
    const token = vocabulary.tokens[id] ?? "";
    if (token !== previous && token !== blank) text += token === vocabulary.wordDelimiter ? " " : token;
    previous = token;
  }
  return text.replaceAll(LANGUAGE_TAG, " ").split(/\s+/).filter(Boolean).join(" ");
}
