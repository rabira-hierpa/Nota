/** Letters (any script, Ge'ez included), combining marks, digits, `_` and `-`. */
const TAG_WORD = String.raw`[\p{L}\p{M}\p{N}_-]+`;
/**
 * Bear-style tags: `#tag` or nested `#parent/child`, at the start of a line or
 * after a space or opening bracket (so `site.com/#anchor` is not a tag).
 */
const TAG_PATTERN = new RegExp(String.raw`(^|[\s([{])#(${TAG_WORD}(?:/${TAG_WORD})*)`, "gu");
const HAS_LETTER = /\p{L}/u;
const SEPARATOR = "/";

export interface TagMatch {
  /** Normalized: lower case, as stored and matched. */
  tag: string;
  /** Offsets of `#tag` in the text, `#` included. */
  start: number;
  end: number;
}

export interface TagNode {
  /** The last segment, e.g. "meetings". */
  name: string;
  /** The whole path, e.g. "work/meetings". */
  path: string;
  /** Notes tagged with this path or anything under it. */
  count: number;
  children: TagNode[];
}

export function normalizeTag(tag: string): string {
  return tag.toLowerCase();
}

/** Every tag in `text`, in order. `#2024` alone is a number, not a tag. */
export function findTags(text: string): TagMatch[] {
  const matches: TagMatch[] = [];
  for (const match of text.matchAll(TAG_PATTERN)) {
    const [, lead = "", name = ""] = match;
    if (!HAS_LETTER.test(name)) continue;
    const start = (match.index ?? 0) + lead.length;
    matches.push({ tag: normalizeTag(name), start, end: start + 1 + name.length });
  }
  return matches;
}

/** The distinct tags in `text`. */
export function extractTags(text: string): string[] {
  return [...new Set(findTags(text).map((match) => match.tag))];
}

/** True when the note carries `path` itself or any tag nested under it. */
export function hasTag(noteTags: readonly string[], path: string): boolean {
  const prefix = `${path}${SEPARATOR}`;
  return noteTags.some((tag) => tag === path || tag.startsWith(prefix));
}

function ancestorsAndSelf(tag: string): string[] {
  const parts = tag.split(SEPARATOR);
  return parts.map((_, index) => parts.slice(0, index + 1).join(SEPARATOR));
}

/** The sidebar's tag tree: parents exist for nested tags even if nothing is tagged with the parent alone. */
export function buildTagTree(tagLists: readonly (readonly string[])[]): TagNode[] {
  const counts = new Map<string, number>();
  for (const tags of tagLists) {
    const paths = new Set(tags.flatMap(ancestorsAndSelf));
    for (const path of paths) counts.set(path, (counts.get(path) ?? 0) + 1);
  }

  const roots: TagNode[] = [];
  const nodes = new Map<string, TagNode>();
  const ordered = [...counts.keys()].sort((a, b) => a.localeCompare(b));
  for (const path of ordered) {
    const cut = path.lastIndexOf(SEPARATOR);
    const node: TagNode = { name: path.slice(cut + 1), path, count: counts.get(path) ?? 0, children: [] };
    nodes.set(path, node);
    const parent = cut === -1 ? undefined : nodes.get(path.slice(0, cut));
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}
