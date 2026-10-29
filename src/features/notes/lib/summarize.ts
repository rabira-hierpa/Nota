import { findTags } from "@/features/notes/lib/tags";
import { cosine, splitSentences, trigramVector, wordsOf } from "@/features/notes/lib/text-similarity";
import type { TermVector } from "@/features/notes/lib/text-similarity";

/** How a summary added to the note begins (ማጠቃለያ: summary), so it is found again and not summarized itself. */
export const SUMMARY_LABEL = "ማጠቃለያ፦";

/** Fewer sentences than this are their own summary. */
export const MIN_SENTENCES_TO_SUMMARIZE = 3;
/** A sentence this short ("እሺ።") says too little to stand for the note. */
const MIN_WORDS_IN_SENTENCE = 3;
/** About one sentence in five, between one and four. */
const SENTENCES_PER_SUMMARY_SENTENCE = 5;
const MAX_SUMMARY_SENTENCES = 4;
/** A candidate this close to a sentence already picked would repeat it. */
const MAX_OVERLAP = 0.6;
/** TextRank's damping factor and iterations (it settles well before). */
const DAMPING = 0.85;
const ITERATIONS = 40;
/** Notes and talks tend to open with what they are about: the first sentences get a small lift. */
const LEAD_BONUS = 0.25;

/** The note's sentences that can stand for it: not the title line, not a line of tags, not one-word replies. */
function candidates(text: string): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const body = lines.length > 1 ? lines.slice(1) : lines;
  return body
    .filter((line) => !line.startsWith(SUMMARY_LABEL))
    .filter((line) => line.replace(/\s+/g, "").length > findTags(line).reduce((sum, tag) => sum + tag.end - tag.start, 0))
    .flatMap(splitSentences)
    .filter((sentence) => wordsOf(sentence).length >= MIN_WORDS_IN_SENTENCE);
}

/** Weighs each trigram by how rare it is across the note's sentences, so common endings count for less. */
function weighted(vectors: TermVector[]): TermVector[] {
  const documentFrequency = new Map<string, number>();
  for (const vector of vectors) {
    for (const term of vector.keys()) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  }
  return vectors.map(
    (vector) =>
      new Map(
        [...vector].map(([term, count]) => [term, count * Math.log(1 + vectors.length / (documentFrequency.get(term) ?? 1))]),
      ),
  );
}

/** TextRank: a sentence matters when sentences that matter are like it. */
function rank(similarity: number[][]): number[] {
  const count = similarity.length;
  const outgoing = similarity.map((row) => row.reduce((sum, value) => sum + value, 0));
  let scores = new Array<number>(count).fill(1 / count);
  for (let round = 0; round < ITERATIONS; round += 1) {
    scores = scores.map((_, target) => {
      let incoming = 0;
      for (let source = 0; source < count; source += 1) {
        const weight = similarity[source]?.[target] ?? 0;
        const total = outgoing[source] ?? 0;
        if (weight > 0 && total > 0) incoming += (weight / total) * (scores[source] ?? 0);
      }
      return (1 - DAMPING) / count + DAMPING * incoming;
    });
  }
  return scores;
}

/**
 * The note's key sentences, in the order they appear: an extractive summary
 * (each sentence is the note's own words). It needs no model and no network,
 * so it works on any computer, offline. Empty when the note is too short.
 */
export function summarize(text: string): string[] {
  const sentences = candidates(text);
  if (sentences.length < MIN_SENTENCES_TO_SUMMARIZE) return [];
  const vectors = weighted(sentences.map(trigramVector));
  const similarity = vectors.map((a, row) => vectors.map((b, column) => (row === column ? 0 : cosine(a, b))));
  const scores = rank(similarity).map((score, index) => score * (1 + LEAD_BONUS / (index + 1)));
  const wanted = Math.min(
    MAX_SUMMARY_SENTENCES,
    Math.max(1, Math.round(sentences.length / SENTENCES_PER_SUMMARY_SENTENCE)),
  );

  const picked: number[] = [];
  const byScore = scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score);
  for (const { index } of byScore) {
    if (picked.length === wanted) break;
    if (picked.every((other) => (similarity[index]?.[other] ?? 0) < MAX_OVERLAP)) picked.push(index);
  }
  return picked.sort((a, b) => a - b).map((index) => sentences[index] ?? "");
}
