/**
 * The punctuation model's word-piece tokenizer: SentencePiece's unigram
 * model, cut to the pieces Amharic text uses (scripts/build_speech_models.py).
 * Words are encoded one at a time, as `sp.EncodeAsIds(word)` does.
 */

export interface PieceTable {
  /** [piece, score] by id; the first `specials` are control pieces and never match text. */
  pieces: readonly (readonly [string, number])[];
  specials: number;
  unk: number;
}

/** SentencePiece's word-start marker (U+2581), which stands for the space before a word. */
const WORD_START = "▁";
/** What SentencePiece takes off the lowest piece score for a character no piece covers. */
const UNKNOWN_PENALTY = 10;

interface Step {
  score: number;
  from: number;
  id: number;
}

export class UnigramTokenizer {
  private readonly ids = new Map<string, { id: number; score: number }>();
  private readonly longest: number;
  private readonly unknownScore: number;

  constructor(private readonly table: PieceTable) {
    let longest = 1;
    let lowest = Infinity;
    table.pieces.forEach(([piece, score], id) => {
      if (id < table.specials) return;
      this.ids.set(piece, { id, score });
      longest = Math.max(longest, [...piece].length);
      lowest = Math.min(lowest, score);
    });
    this.longest = longest;
    this.unknownScore = Math.fround(lowest - UNKNOWN_PENALTY);
  }

  /** The ids of one word (no spaces), with consecutive unknown characters merged into one unknown id. */
  encodeWord(word: string): number[] {
    const chars = [...`${WORD_START}${word.normalize("NFKC")}`];
    const best = this.viterbi(chars);
    const ids: number[] = [];
    for (let end = chars.length; end > 0; end = best[end].from) ids.push(best[end].id);
    ids.reverse();
    return ids.filter((id, i) => id !== this.table.unk || ids[i - 1] !== this.table.unk);
  }

  /**
   * The best-scoring way to cut `chars` into pieces: for each end position,
   * the best score up to there and the piece that ends there. Scores add up in
   * float32, as in SentencePiece's lattice.
   */
  private viterbi(chars: readonly string[]): Step[] {
    const best: Step[] = [{ score: 0, from: 0, id: -1 }];
    for (let end = 1; end <= chars.length; end++) best.push({ score: -Infinity, from: 0, id: this.table.unk });
    for (let begin = 0; begin < chars.length; begin++) {
      let single = false;
      let piece = "";
      for (let length = 1; length <= this.longest && begin + length <= chars.length; length++) {
        piece += chars[begin + length - 1];
        const match = this.ids.get(piece);
        if (!match) continue;
        if (length === 1) single = true;
        this.relax(best, begin, begin + length, match.id, match.score);
      }
      if (!single) this.relax(best, begin, begin + 1, this.table.unk, this.unknownScore);
    }
    return best;
  }

  private relax(best: Step[], from: number, end: number, id: number, score: number): void {
    const total = Math.fround(best[from].score + score);
    if (total > best[end].score) best[end] = { score: total, from, id };
  }
}
