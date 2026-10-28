"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import type { Editor } from "@tiptap/react";

/**
 * Typewriter scrolling for Zen mode: the line being written (or dictated)
 * stays in the middle of the screen, so the eyes don't chase it down the page.
 */
export function useTypewriterScroll(editor: Editor | null, container: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!editor || !active) return;
    const centre = () => {
      const box = container.current;
      if (!box || editor.isDestroyed) return;
      const caret = editor.view.coordsAtPos(editor.state.selection.head);
      const frame = box.getBoundingClientRect();
      box.scrollBy({ top: caret.top - (frame.top + frame.height / 2) });
    };
    editor.on("selectionUpdate", centre);
    editor.on("update", centre);
    centre();
    return () => {
      editor.off("selectionUpdate", centre);
      editor.off("update", centre);
    };
  }, [active, container, editor]);
}
