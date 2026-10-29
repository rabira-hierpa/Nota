import { wordCount } from "@/features/notes/lib/note-text";

export interface NoteStats {
  /** Blocks with text: paragraphs, headings, list items and quotes alike. */
  paragraphs: number;
  words: number;
  /** Letters as a reader counts them: each Ge'ez syllable (ፊ, ደ, ል) is one. */
  characters: number;
  charactersWithoutSpaces: number;
}

const WHITESPACE = /\s/u;
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Counts for a note's plain text (one line per block, as the editor reports it). */
export function noteStats(text: string): NoteStats {
  const blocks = text.split("\n").filter((line) => line.trim().length > 0);
  let characters = 0;
  let charactersWithoutSpaces = 0;
  for (const { segment } of graphemes.segment(blocks.join(" "))) {
    characters += 1;
    if (!WHITESPACE.test(segment)) charactersWithoutSpaces += 1;
  }
  return { paragraphs: blocks.length, words: wordCount(text), characters, charactersWithoutSpaces };
}
