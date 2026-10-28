"use client";

import { useEffect } from "react";
import { useNotesStore } from "@/features/notes/stores/notes-store";

/** Loads the saved notes from the main process once, on first mount. */
export function useLoadNotes(): void {
  const loadNotes = useNotesStore((state) => state.loadNotes);
  const idle = useNotesStore((state) => state.load.kind === "idle");

  useEffect(() => {
    if (idle) void loadNotes();
  }, [idle, loadNotes]);
}
