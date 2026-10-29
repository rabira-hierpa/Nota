/**
 * Plain-text measures for the note assistant: sentences, words, and how
 * alike two pieces of text are. Amharic glues prefixes and suffixes onto its
 * words (በገበያ, ስብሰባውን), so likeness is measured on letter trigrams inside
 * each word, which still match across those forms without a dictionary.
 */

/** Term → weight. */
export type TermVector = Map<string, number>;

const sentences = new Intl.Segmenter("am", { granularity: "sentence" });
const words = new Intl.Segmenter("am", { granularity: "word" });
const graphemes = new Intl.Segmenter("am", { granularity: "grapheme" });
const HAS_LETTER = /\p{L}/u;
const GRAM_SIZE = 3;

/** The sentences of a text, each trimmed; Ethiopic full stops (።) and question marks (፧) end them too. */
export function splitSentences(text: string): string[] {
  return text
    .split("\n")
    .flatMap((line) => [...sentences.segment(line)].map(({ segment }) => segment.trim()))
    .filter(Boolean);
}

/** The words of a text, lower-cased, without punctuation or bare numbers. */
export function wordsOf(text: string): string[] {
  return [...words.segment(text)]
    .filter(({ segment, isWordLike }) => isWordLike && HAS_LETTER.test(segment))
    .map(({ segment }) => segment.toLowerCase());
}

/** Letters as a reader counts them: one per Ge'ez syllable. */
export function letters(word: string): string[] {
  return [...graphemes.segment(word)].map(({ segment }) => segment);
}

/** Counts of the letter trigrams in each word (padded, so short words and word edges count). */
export function trigramVector(text: string): TermVector {
  const vector: TermVector = new Map();
  for (const word of wordsOf(text)) {
    const padded = ["^", ...letters(word), "$"];
    for (let at = 0; at + GRAM_SIZE <= padded.length; at += 1) {
      const gram = padded.slice(at, at + GRAM_SIZE).join("");
      vector.set(gram, (vector.get(gram) ?? 0) + 1);
    }
  }
  return vector;
}

function norm(vector: TermVector): number {
  let sum = 0;
  for (const weight of vector.values()) sum += weight * weight;
  return Math.sqrt(sum);
}

/** 0 (nothing in common) … 1 (the same terms in the same proportions). */
export function cosine(a: TermVector, b: TermVector): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small) dot += weight * (large.get(term) ?? 0);
  const lengths = norm(a) * norm(b);
  return lengths === 0 ? 0 : dot / lengths;
}

/** Adds `vector`, scaled to unit length, into `into`: a running centroid. */
export function addNormalized(into: TermVector, vector: TermVector): void {
  const length = norm(vector);
  if (length === 0) return;
  for (const [term, weight] of vector) into.set(term, (into.get(term) ?? 0) + weight / length);
}
