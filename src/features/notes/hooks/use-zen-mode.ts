"use client";

import { useEffect } from "react";
import { useViewStore } from "@/features/notes/stores/view-store";

/**
 * Zen mode hides the sidebar, the note list and the formatting bar
 * (`html[data-zen]` in globals.css), leaving only the note. Also restores
 * the saved view choices once.
 */
export function useZenMode(): void {
  const zen = useViewStore((state) => state.zen);
  const restore = useViewStore((state) => state.restore);

  useEffect(() => restore(), [restore]);

  useEffect(() => {
    const root = document.documentElement;
    if (zen) root.setAttribute("data-zen", "");
    else root.removeAttribute("data-zen");
  }, [zen]);
}
