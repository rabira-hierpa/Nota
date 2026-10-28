import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findLinks } from "@/features/notes/lib/note-links";
import { findTags } from "@/features/notes/lib/tags";

export interface NoteDecorationOptions {
  /** ⌘-click (Ctrl-click elsewhere) on a tag shows the notes carrying it. */
  onTagClick: (tag: string) => void;
  /** ⌘-click on a `[[link]]` opens that note (or starts one with that title). */
  onLinkClick: (title: string) => void;
}

const decorationKey = new PluginKey<DecorationSet>("note-decorations");
/** Hard breaks and other leaves count as one character, so offsets match document positions. */
const LEAF_TEXT = "\n";

function decorate(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) return true;
    // `#include` or `[[x]]` in a code block is code.
    if (node.type.spec.code) return false;
    const text = node.textBetween(0, node.content.size, undefined, LEAF_TEXT);
    const at = (offset: number) => position + 1 + offset;
    for (const match of findTags(text)) {
      decorations.push(Decoration.inline(at(match.start), at(match.end), { class: "nota-tag", "data-tag": match.tag }));
    }
    for (const link of findLinks(text)) {
      decorations.push(
        Decoration.inline(at(link.start), at(link.end), { class: "nota-link", "data-link": link.title }),
      );
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

/** Bear-style tags and links in the text: drawn as pills, found by the same rules as the sidebar. */
export const NoteDecorations = Extension.create<NoteDecorationOptions>({
  name: "noteDecorations",

  addOptions() {
    return { onTagClick: () => undefined, onLinkClick: () => undefined };
  },

  addProseMirrorPlugins() {
    const { onTagClick, onLinkClick } = this.options;
    return [
      new Plugin<DecorationSet>({
        key: decorationKey,
        state: {
          init: (_, state) => decorate(state.doc),
          apply: (transaction, previous) => (transaction.docChanged ? decorate(transaction.doc) : previous),
        },
        props: {
          decorations: (state) => decorationKey.getState(state),
          handleClick: (_view, _position, event) => {
            if (!(event.metaKey || event.ctrlKey) || !(event.target instanceof HTMLElement)) return false;
            const tag = event.target.closest<HTMLElement>(".nota-tag")?.dataset.tag;
            const link = event.target.closest<HTMLElement>(".nota-link")?.dataset.link;
            if (tag) onTagClick(tag);
            else if (link) onLinkClick(link);
            return Boolean(tag ?? link);
          },
        },
      }),
    ];
  },
});
