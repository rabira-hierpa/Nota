import { extractTags, findTags } from "@/features/notes/lib/tags";
import { addNormalized, cosine, letters, trigramVector, wordsOf } from "@/features/notes/lib/text-similarity";
import type { TermVector } from "@/features/notes/lib/text-similarity";

export interface TagSuggestion {
  tag: string;
  /** "library": a tag the notes most like this one carry. "keyword": a word this note keeps coming back to. */
  source: "library" | "keyword";
}

/** A note, as the suggestions read it: its plain text and the tags in it. */
export interface TaggedText {
  id: string;
  text: string;
  tags: readonly string[];
}

/** A tag's notes must be at least this like the note for the tag to be offered. */
const MIN_TAG_LIKENESS = 0.2;
const MAX_LIBRARY_TAGS = 3;
const MAX_KEYWORDS = 3;
/** A keyword appears at least this often in the note. */
const MIN_KEYWORD_COUNT = 2;
/** Ge'ez letters are syllables: two make a word (ቤት), where Latin needs four. */
const MIN_ETHIOPIC_LETTERS = 2;
const MIN_LATIN_LETTERS = 4;
const ETHIOPIC = /\p{Script=Ethiopic}/u;
/** Prepositions written onto the word (የ-, በ-, ለ-, ከ-, እንደ-, ስለ-), and endings (-ን, -ም, -ና, -ው, -ዋ). */
const PREFIXES = ["እንደ", "ስለ", "የ", "በ", "ለ", "ከ"];
const SUFFIXES = ["ን", "ም", "ና", "ው", "ዋ"];

/** Words that say little about what a note is about. */
const STOP_WORDS = new Set([
  "እና", "ነው", "ናቸው", "ነበር", "ነበሩ", "ነኝ", "ነህ", "ነሽ", "ነን", "ናችሁ", "አለ", "አሉ", "አለች", "አለኝ", "አለበት",
  "የለም", "የሉም", "ላይ", "ውስጥ", "ወደ", "ጋር", "ስለ", "እንደ", "ግን", "ወይም", "ደግሞ", "ብቻ", "ሁሉ", "ሁሉም",
  "ይህ", "ይህን", "ይሄ", "ያ", "ያንን", "እነዚህ", "እነዚያ", "እኔ", "አንተ", "አንቺ", "እሱ", "እሷ", "እርሱ", "እርሷ",
  "እኛ", "እናንተ", "እነሱ", "እርስዎ", "ምን", "ማን", "እንዴት", "የት", "መቼ", "ለምን", "ስንት", "በጣም", "አንድ",
  "ሁለት", "ሌላ", "ሌሎች", "ምክንያቱም", "ስለዚህ", "ከዚያ", "ከዚህ", "እዚህ", "እዚያ", "አሁን", "ገና", "ቢሆንም",
  "እንጂ", "ነገር", "ጊዜ", "ሆነ", "ሆኖ", "ይሆናል", "ወዘተ", "በኋላ", "በፊት", "ዛሬ", "ነገ", "ትናንት", "ቀን", "ሳምንት",
  "ወር", "ዓመት", "አመት", "ሰዓት", "ደቂቃ",
  "the", "and", "for", "with", "that", "this", "from", "have", "were", "they", "their", "there", "about", "would",
  "will", "what", "when", "which", "your", "into", "also", "been", "than", "then", "them", "just", "some",
]);

function longEnough(word: string): boolean {
  const count = letters(word).length;
  return ETHIOPIC.test(word) ? count >= MIN_ETHIOPIC_LETTERS : count >= MIN_LATIN_LETTERS;
}

/** One affix off each end, while a word of two letters or more is left: ለስብሰባውን → ስብሰባ. */
function stem(word: string): string {
  let parts = letters(word);
  const prefix = PREFIXES.find((candidate) => parts.join("").startsWith(candidate));
  if (prefix && parts.length - letters(prefix).length >= 3) parts = parts.slice(letters(prefix).length);
  for (const suffix of SUFFIXES) {
    if (parts.length > 3 && parts.at(-1) === suffix) parts = parts.slice(0, -1);
  }
  return parts.join("");
}

/** The text without its `#tags`, so a tag's own word doesn't make notes look alike. */
function withoutTags(text: string): string {
  let result = "";
  let from = 0;
  for (const { start, end } of findTags(text)) {
    result += text.slice(from, start);
    from = end;
  }
  return result + text.slice(from);
}

/** Tags already in use whose notes read most like this one. */
function libraryTags(vector: TermVector, own: readonly string[], others: readonly TaggedText[]): TagSuggestion[] {
  const centroids = new Map<string, TermVector>();
  for (const other of others) {
    const otherVector = trigramVector(withoutTags(other.text));
    for (const tag of other.tags) {
      const centroid = centroids.get(tag) ?? new Map<string, number>();
      addNormalized(centroid, otherVector);
      centroids.set(tag, centroid);
    }
  }
  const alike = [...centroids]
    .filter(([tag]) => !own.includes(tag))
    .map(([tag, centroid]) => ({ tag, likeness: cosine(vector, centroid) }))
    .filter(({ likeness }) => likeness >= MIN_TAG_LIKENESS);
  // #work/meetings says #work too: offer the nested tag rather than both.
  return alike
    .filter(({ tag }) => !alike.some((other) => other.tag.startsWith(`${tag}/`)))
    .sort((a, b) => b.likeness - a.likeness)
    .slice(0, MAX_LIBRARY_TAGS)
    .map(({ tag }) => ({ tag, source: "library" }));
}

/** Words this note repeats that other notes rarely use, each in its shortest written form. */
function keywordTags(body: string, own: readonly string[], others: readonly TaggedText[]): TagSuggestion[] {
  const forms = new Map<string, { count: number; shortest: string }>();
  for (const word of wordsOf(body)) {
    if (STOP_WORDS.has(word) || !longEnough(word)) continue;
    const key = stem(word);
    const entry = forms.get(key) ?? { count: 0, shortest: word };
    entry.count += 1;
    if (letters(word).length < letters(entry.shortest).length) entry.shortest = word;
    forms.set(key, entry);
  }
  const otherStems = others.map((other) => new Set(wordsOf(other.text).map(stem)));
  return [...forms]
    .filter(([, { count, shortest }]) => count >= MIN_KEYWORD_COUNT && !own.includes(shortest) && !STOP_WORDS.has(stem(shortest)))
    .map(([key, { count, shortest }]) => {
      const usedBy = otherStems.filter((stems) => stems.has(key)).length;
      return { tag: shortest, score: count * Math.log((others.length + 1) / (usedBy + 1) + 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_KEYWORDS)
    .map(({ tag }) => ({ tag, source: "keyword" }));
}

/**
 * Tags for a note: first the library's own tags that notes like it carry
 * (so it files in with them), then words it keeps returning to, as new tags.
 * Plain counting on the computer; nothing leaves it.
 */
export function suggestTags(note: { id: string; text: string }, library: readonly TaggedText[]): TagSuggestion[] {
  const own = extractTags(note.text);
  const body = withoutTags(note.text);
  const others = library.filter((other) => other.id !== note.id);
  const fromLibrary = libraryTags(trigramVector(body), own, others);
  const keywords = keywordTags(body, own, others).filter(
    (keyword) => !fromLibrary.some((suggestion) => suggestion.tag.split("/").includes(keyword.tag)),
  );
  return [...fromLibrary, ...keywords];
}
