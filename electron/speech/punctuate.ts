import { z } from "zod";
import type { UnigramTokenizer } from "@main/speech/sentencepiece";

/** models/punct.json. */
export const punctuationConfigSchema = z.object({
  maxLength: z.number().int().min(3),
  postLabels: z.array(z.string()).min(1),
  bos: z.number().int().nonnegative(),
  eos: z.number().int().nonnegative(),
  unk: z.number().int().nonnegative(),
  specials: z.number().int().nonnegative(),
  pieces: z.array(z.tuple([z.string(), z.number()])),
});
export type PunctuationConfig = z.infer<typeof punctuationConfigSchema>;

/** The model's answers for one window, per position (BOS and EOS included). */
export interface WindowLabels {
  /** Index into postLabels: the mark after each piece. */
  post: ArrayLike<number>;
  /** Whether a sentence ends after each piece. */
  seg: ArrayLike<number>;
}

export type RunWindow = (ids: readonly number[]) => Promise<WindowLabels>;

/** Labels that end a sentence with a question, and those that end it with a full stop (Ethiopic ። for both scripts). */
const QUESTION_LABELS = new Set(["?", "？", "؟", "፧"]);
const FULL_STOP_LABELS = new Set([".", "。", "।", "።"]);
const QUESTION_MARK = "?";
const FULL_STOP = "።";
/** A word already ending in one of these keeps it. */
const SENTENCE_END = /[.!?።፧]$/u;

interface Label {
  margin: number;
  post: number;
  seg: number;
}

/**
 * Labels for every piece. Long texts run in windows that overlap by half;
 * each piece takes its label from the window where it sits furthest from a cut.
 */
async function labelPieces(ids: readonly number[], config: PunctuationConfig, run: RunWindow): Promise<Label[]> {
  const room = config.maxLength - 2;
  const step = Math.floor(room / 2);
  const labels: Label[] = ids.map(() => ({ margin: -1, post: 0, seg: 0 }));
  for (let start = 0; ; start += step) {
    const chunk = ids.slice(start, start + room);
    const window = await run([config.bos, ...chunk, config.eos]);
    const atStart = start === 0;
    const atEnd = start + room >= ids.length;
    chunk.forEach((_, k) => {
      const margin = Math.min(atStart ? ids.length : k, atEnd ? ids.length : chunk.length - 1 - k);
      if (margin > labels[start + k].margin) {
        labels[start + k] = { margin, post: Number(window.post[k + 1]), seg: Number(window.seg[k + 1]) };
      }
    });
    if (atEnd) return labels;
  }
}

/**
 * The sentence end to write after a word, given the mark the model puts
 * there and whether its sentence head ends a sentence there: both must agree.
 */
export function sentenceEnd(mark: string, endsSentence: boolean): string {
  if (!endsSentence) return "";
  if (QUESTION_LABELS.has(mark)) return QUESTION_MARK;
  return FULL_STOP_LABELS.has(mark) ? FULL_STOP : "";
}

/**
 * Hohe's text with sentence ends put back (it writes none). Only full stops
 * and question marks: on Hohe's FLEURS text the model's full stops score
 * F1 82, its commas about 35, so commas are left out.
 */
export async function punctuate(
  text: string,
  tokenizer: UnigramTokenizer,
  config: PunctuationConfig,
  run: RunWindow,
): Promise<string> {
  const words = text.split(/\s+/).filter(Boolean);
  const ids: number[] = [];
  const lastPiece = words.map((word) => {
    ids.push(...tokenizer.encodeWord(word));
    return ids.length - 1;
  });
  if (ids.length === 0) return text;
  const labels = await labelPieces(ids, config, run);
  return words
    .map((word, i) => {
      const { post, seg } = labels[lastPiece[i]];
      return SENTENCE_END.test(word) ? word : `${word}${sentenceEnd(config.postLabels[post] ?? "", seg !== 0)}`;
    })
    .join(" ");
}
