import { TagTreeItem } from "@/features/notes/components/tag-tree-item";
import type { TagNode } from "@/features/notes/lib/tags";
import type { Messages } from "@/lib/i18n";

interface TagTreeProps {
  tags: TagNode[];
  /** The sidebar's words, in the interface's language. */
  words: Messages["sidebar"];
}

/** The sidebar's Tags: every #tag written in a note, nested by `/`. */
export function TagTree({ tags, words }: TagTreeProps) {
  return (
    <div className="mt-5">
      <h2 className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{words.tags}</h2>
      {tags.length === 0 ? (
        <p className="px-2.5 text-xs leading-5 text-muted">
          {words.tagHintBefore} <span className="rounded bg-accent-soft px-1 font-medium text-accent-ink">#tag</span>{" "}
          {words.tagHintAfter}
        </p>
      ) : (
        <ul className="-ml-1 space-y-0.5">
          {tags.map((node) => (
            <TagTreeItem key={node.path} node={node} />
          ))}
        </ul>
      )}
    </div>
  );
}
