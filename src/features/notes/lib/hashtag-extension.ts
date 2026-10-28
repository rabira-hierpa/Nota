import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findTags } from "@/features/notes/lib/tags";

export interface HashtagOptions {
  /** ⌘-click (Ctrl-click elsewhere) on a tag shows the notes carrying it. */
  onTagClick: (tag: string) => void;
}

const hashtagKey = new PluginKey<DecorationSet>("hashtags");
/** Hard breaks and other leaves count as one character, so offsets match document positions. */
const LEAF_TEXT = "\n";

function decorateTags(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) return true;
    // `#include` in a code block is code, not a tag.
    if (node.type.spec.code) return false;
    const text = node.textBetween(0, node.content.size, undefined, LEAF_TEXT);
    for (const match of findTags(text)) {
      const from = position + 1 + match.start;
      decorations.push(
        Decoration.inline(from, position + 1 + match.end, { class: "nota-tag", "data-tag": match.tag }),
      );
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

/** Bear-style tags in the text: drawn as pills, found by the same rules as the sidebar. */
export const Hashtags = Extension.create<HashtagOptions>({
  name: "hashtags",

  addOptions() {
    return { onTagClick: () => undefined };
  },

  addProseMirrorPlugins() {
    const { onTagClick } = this.options;
    return [
      new Plugin<DecorationSet>({
        key: hashtagKey,
        state: {
          init: (_, state) => decorateTags(state.doc),
          apply: (transaction, previous) => (transaction.docChanged ? decorateTags(transaction.doc) : previous),
        },
        props: {
          decorations: (state) => hashtagKey.getState(state),
          handleClick: (_view, _position, event) => {
            if (!(event.metaKey || event.ctrlKey) || !(event.target instanceof HTMLElement)) return false;
            const tag = event.target.closest<HTMLElement>(".nota-tag")?.dataset.tag;
            if (!tag) return false;
            onTagClick(tag);
            return true;
          },
        },
      }),
    ];
  },
});
