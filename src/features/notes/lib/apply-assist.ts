import type { Editor, JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { splitIntoParagraphs } from "@/features/notes/lib/split-paragraphs";
import { SUMMARY_LABEL } from "@/features/notes/lib/summarize";
import { findTags } from "@/features/notes/lib/tags";

/** Text nodes only, never HTML: what the assistant writes goes in exactly as the note had it. */
function paragraph(...content: JSONContent[]): JSONContent {
  return { type: "paragraph", content };
}

function text(value: string, bold = false): JSONContent {
  return bold ? { type: "text", text: value, marks: [{ type: "bold" }] } : { type: "text", text: value };
}

/** Where a summary added before sits, if there is one. */
function findSummary(doc: ProseMirrorNode): { from: number; to: number } | null {
  let offset = 0;
  for (let index = 0; index < doc.childCount; index += 1) {
    const node = doc.child(index);
    if (node.type.name === "blockquote" && node.textContent.startsWith(SUMMARY_LABEL)) {
      return { from: offset, to: offset + node.nodeSize };
    }
    offset += node.nodeSize;
  }
  return null;
}

/** Plain text with no formatting: safe to cut into paragraphs without losing anything. */
function isPlainParagraph(node: ProseMirrorNode): boolean {
  if (node.type.name !== "paragraph" || node.childCount === 0) return false;
  let plain = true;
  node.forEach((child) => {
    if (!child.isText || child.marks.length > 0) plain = false;
  });
  return plain;
}

/**
 * Puts the summary under the note's first line (which stays its title), as
 * a quote starting "ማጠቃለያ፦". Summarizing again replaces it.
 */
export function insertSummary(editor: Editor, sentences: readonly string[]): void {
  const quote: JSONContent = {
    type: "blockquote",
    content: [paragraph(text(`${SUMMARY_LABEL} `, true), text(sentences.join(" ")))],
  };
  const node = editor.schema.nodeFromJSON(quote);
  editor
    .chain()
    .command(({ tr }) => {
      const existing = findSummary(tr.doc);
      if (existing) tr.replaceWith(existing.from, existing.to, node);
      else tr.insert(tr.doc.firstChild?.nodeSize ?? 0, node);
      return true;
    })
    .run();
}

/** Cuts each long, unformatted paragraph where its topic changes. Returns how many were cut. */
export function splitLongParagraphs(editor: Editor): number {
  const cuts: { from: number; to: number; parts: string[] }[] = [];
  editor.state.doc.forEach((node, offset) => {
    if (!isPlainParagraph(node)) return;
    const parts = splitIntoParagraphs(node.textContent);
    if (parts.length > 1) cuts.push({ from: offset, to: offset + node.nodeSize, parts });
  });
  if (cuts.length === 0) return 0;
  editor
    .chain()
    .command(({ tr }) => {
      // Last first, so the positions of the earlier ones still hold.
      for (const { from, to, parts } of cuts.reverse()) {
        tr.replaceWith(
          from,
          to,
          parts.map((part) => editor.schema.nodeFromJSON(paragraph(text(part)))),
        );
      }
      return true;
    })
    .run();
  return cuts.length;
}

/** How many paragraphs `splitLongParagraphs` would cut. */
export function countSplittable(editor: Editor): number {
  let count = 0;
  editor.state.doc.forEach((node) => {
    if (isPlainParagraph(node) && splitIntoParagraphs(node.textContent).length > 1) count += 1;
  });
  return count;
}

/** Adds `#tag`s to the note's last line when it holds only tags (or nothing), or on a new last line. */
export function addTags(editor: Editor, tags: readonly string[]): void {
  if (tags.length === 0) return;
  const written = tags.map((tag) => `#${tag}`).join(" ");
  const { doc } = editor.state;
  const last = doc.lastChild;
  const lastText = last?.textContent.trim() ?? "";
  const lastIsParagraph = last?.type.name === "paragraph";
  const onlyTags =
    lastIsParagraph &&
    lastText.length > 0 &&
    lastText.replace(/\s+/g, "").length === findTags(lastText).reduce((sum, tag) => sum + tag.end - tag.start, 0);
  // The editor keeps an empty paragraph at the end for the cursor: write into it rather than below it.
  const emptyLast = lastIsParagraph && lastText.length === 0;
  editor
    .chain()
    .command(({ tr }) => {
      if (onlyTags || emptyLast) tr.insertText(onlyTags ? ` ${written}` : written, tr.doc.content.size - 1);
      else tr.insert(tr.doc.content.size, editor.schema.nodeFromJSON(paragraph(text(written))));
      return true;
    })
    .run();
}
