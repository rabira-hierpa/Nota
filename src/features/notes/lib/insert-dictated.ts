import type { Editor } from "@tiptap/core";

const WHITESPACE = /\s/;

/** Puts the cursor where dictation should type: where the user left it, or the end of a note they haven't clicked into. */
export function placeDictationCursor(editor: Editor): void {
  if (editor.state.selection.from <= 1) editor.commands.focus("end");
  else editor.commands.focus();
}

/** Types dictated words at the cursor, with a space before them when they follow a word. */
export function insertDictated(editor: Editor, text: string): void {
  if (editor.isDestroyed || !text) return;
  const { from } = editor.state.selection;
  const before = from > 1 ? editor.state.doc.textBetween(from - 1, from, "\n", "\n") : "";
  const spaced = before && !WHITESPACE.test(before) ? ` ${text}` : text;
  // A text node, never HTML: the transcript is inserted exactly as spoken.
  editor.chain().insertContent({ type: "text", text: spaced }).run();
}
