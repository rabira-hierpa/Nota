import { hasTag, normalizeTag } from "@/features/notes/lib/tags";

export interface SearchQuery {
  /** Words that must all appear in the note, lower case. */
  terms: string[];
  /** `#tags` the note must carry. */
  tags: string[];
}

export interface TextPart {
  text: string;
  match: boolean;
}

const TAG_PREFIX = "#";

/** "ስብሰባ #work" → terms ["ስብሰባ"], tags ["work"]. */
export function parseSearch(input: string): SearchQuery {
  const query: SearchQuery = { terms: [], tags: [] };
  for (const token of input.trim().split(/\s+/)) {
    if (!token) continue;
    if (token.startsWith(TAG_PREFIX) && token.length > 1) query.tags.push(normalizeTag(token.slice(1)));
    else query.terms.push(token.toLowerCase());
  }
  return query;
}

export function isEmptySearch(query: SearchQuery): boolean {
  return query.terms.length === 0 && query.tags.length === 0;
}

export function matchesSearch(text: string, noteTags: readonly string[], query: SearchQuery): boolean {
  const haystack = text.toLowerCase();
  return (
    query.terms.every((term) => haystack.includes(term)) && query.tags.every((tag) => hasTag(noteTags, tag))
  );
}

/** Splits `text` around every occurrence of the search terms, for highlighting. */
export function highlightParts(text: string, terms: readonly string[]): TextPart[] {
  const lower = text.toLowerCase();
  // A few characters change length when lower-cased; offsets would drift, so don't highlight.
  if (terms.length === 0 || lower.length !== text.length) return [{ text, match: false }];

  const ranges: [number, number][] = [];
  for (const term of terms) {
    for (let at = lower.indexOf(term); at !== -1; at = lower.indexOf(term, at + term.length)) {
      ranges.push([at, at + term.length]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const parts: TextPart[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (end <= cursor) continue;
    const from = Math.max(start, cursor);
    const last = parts.at(-1);
    if (from > cursor) parts.push({ text: text.slice(cursor, from), match: false });
    // Overlapping or touching matches read as one highlight.
    if (from === cursor && last?.match) last.text += text.slice(from, end);
    else parts.push({ text: text.slice(from, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}
