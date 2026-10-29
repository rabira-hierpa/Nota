import { cosine, splitSentences, trigramVector } from "@/features/notes/lib/text-similarity";

/** A paragraph shorter than this reads fine as it is. */
export const MIN_SENTENCES_TO_SPLIT = 6;
/** No paragraph is cut shorter than this. */
const MIN_SENTENCES_PER_PARAGRAPH = 2;
/** Without clear changes of topic, paragraphs of about this many sentences. */
const FALLBACK_SENTENCES_PER_PARAGRAPH = 4;
/** Sentences compared on each side of a gap. */
const WINDOW = 2;
/** How far below the average likeness a gap must dip to count as a change of topic, in standard deviations. */
const DIP = 0.5;

/** How alike the sentences just before and just after each gap are (gap g sits before sentence g + 1). */
function gapLikeness(sentences: string[]): number[] {
  return sentences.slice(1).map((_, gap) => {
    const before = sentences.slice(Math.max(0, gap + 1 - WINDOW), gap + 1).join(" ");
    const after = sentences.slice(gap + 1, gap + 1 + WINDOW).join(" ");
    return cosine(trigramVector(before), trigramVector(after));
  });
}

/** Gaps (index of the sentence a paragraph starts at) where the topic changes, lowest likeness first. */
function topicBreaks(sentences: string[]): number[] {
  const likeness = gapLikeness(sentences);
  const mean = likeness.reduce((sum, value) => sum + value, 0) / likeness.length;
  const spread = Math.sqrt(likeness.reduce((sum, value) => sum + (value - mean) ** 2, 0) / likeness.length);
  const chosen: number[] = [];
  const byLikeness = likeness.map((value, gap) => ({ value, start: gap + 1 })).sort((a, b) => a.value - b.value);
  for (const { value, start } of byLikeness) {
    if (value > mean - DIP * spread) break;
    const edges = [0, ...chosen, sentences.length];
    if (edges.every((edge) => Math.abs(edge - start) >= MIN_SENTENCES_PER_PARAGRAPH)) chosen.push(start);
  }
  return chosen.sort((a, b) => a - b);
}

/** Even cuts, for a long stretch with no clear change of topic. */
function evenBreaks(count: number): number[] {
  const parts = Math.ceil(count / FALLBACK_SENTENCES_PER_PARAGRAPH);
  const size = Math.ceil(count / parts);
  return Array.from({ length: parts - 1 }, (_, part) => (part + 1) * size);
}

/**
 * One long paragraph (a transcript arrives as a single block) cut where the
 * topic changes: where the sentences on either side of a gap share the least.
 * Short paragraphs come back as they are.
 */
export function splitIntoParagraphs(paragraph: string): string[] {
  const sentences = splitSentences(paragraph);
  if (sentences.length < MIN_SENTENCES_TO_SPLIT) return [paragraph.trim()];
  const found = topicBreaks(sentences);
  const breaks = found.length > 0 ? found : evenBreaks(sentences.length);
  return [0, ...breaks].map((start, index) => sentences.slice(start, breaks[index] ?? sentences.length).join(" "));
}
