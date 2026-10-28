"use client";

import { useEffect } from "react";
import { useNotesStore } from "@/features/notes/stores/notes-store";

/** The search field's id, so ⌘F can reach it from anywhere. */
export const SEARCH_INPUT_ID = "note-search";

/** Bear's keyboard shortcuts: ⌘N for a new note, ⌘F to search (Ctrl on other systems). */
export function useShortcuts(): void {
  const createNote = useNotesStore((state) => state.createNote);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        void createNote();
      } else if (key === "f") {
        event.preventDefault();
        const search = document.getElementById(SEARCH_INPUT_ID);
        if (search instanceof HTMLInputElement) {
          search.focus();
          search.select();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createNote]);
}
