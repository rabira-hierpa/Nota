/** A first line longer than this (a transcript is often one long line) is cut for the title. */
const TITLE_LIMIT = 80;
const MAX_PREVIEW_LENGTH = 240;
/** Spaces, and the Ge'ez word separator ፡ that older Amharic text uses instead. */
const WORD_BREAK = /[\s፡]+/u;
const SENTENCE_END = /[።.!?፧]$/u;
const SENTENCE_MARK = /[።.!?፧]/gu;
const ELLIPSIS = "…";

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** The title and what follows it: the first line, or its first words when the line runs long. */
function splitTitle(text: string): { title: string; rest: string[] } {
  const [first = "", ...others] = lines(text);
  if (first.length <= TITLE_LIMIT) return { title: first, rest: others };
  // Prefer the end of a sentence, then the end of a word, then just the limit.
  const window = first.slice(0, TITLE_LIMIT + 1);
  const sentenceEnd = Math.max(...[...window.matchAll(SENTENCE_MARK)].map((match) => (match.index ?? 0) + 1), 0);
  const wordEnd = window.lastIndexOf(" ");
  const cut = [sentenceEnd, wordEnd].find((at) => at > TITLE_LIMIT / 2) ?? TITLE_LIMIT;
  const head = first.slice(0, cut).trim();
  return {
    title: SENTENCE_END.test(head) ? head : `${head}${ELLIPSIS}`,
    rest: [first.slice(cut).trim(), ...others],
  };
}

/** Like Bear, a note's title is its first line. Empty when the note has no text. */
export function noteTitle(text: string): string {
  return splitTitle(text).title;
}

/** The text after the title, flattened onto one line for the note list. */
export function notePreview(text: string): string {
  return splitTitle(text).rest.filter(Boolean).join(" ").slice(0, MAX_PREVIEW_LENGTH);
}

export function wordCount(text: string): number {
  return text.split(WORD_BREAK).filter(Boolean).length;
}
