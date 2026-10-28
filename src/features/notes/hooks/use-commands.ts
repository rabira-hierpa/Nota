"use client";

import { useEffect } from "react";
import { isMacPlatform, matchesAccelerator } from "@/features/notes/lib/accelerators";
import { onCommand, runCommand } from "@/features/notes/lib/command-bus";
import { useNotesStore, visibleNotes } from "@/features/notes/stores/notes-store";
import { useViewStore } from "@/features/notes/stores/view-store";
import { subscribeToCommands } from "@/lib/desktop";
import { KEYMAP } from "@shared/keymap";
import type { CommandId } from "@shared/keymap";

/** The search field's id, so ⌘F can reach it from anywhere. */
export const SEARCH_INPUT_ID = "note-search";

/** The menu and the page can both see a key; run each command once. */
const DUPLICATE_WINDOW_MS = 150;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function focusSearch(): void {
  const search = document.getElementById(SEARCH_INPUT_ID);
  if (search instanceof HTMLInputElement) {
    search.focus();
    search.select();
  }
}

function selectAdjacent(step: 1 | -1): void {
  const state = useNotesStore.getState();
  const notes = visibleNotes(state);
  const index = notes.findIndex((note) => note.id === state.selectedId);
  const next = notes[Math.min(Math.max(index + step, 0), notes.length - 1)];
  if (next) void state.select(next.id);
}

/** Commands that need no particular screen; the rest are registered by the components that own their state. */
function registerGlobalCommands(): () => void {
  const notes = () => useNotesStore.getState();
  const view = () => useViewStore.getState();
  const offs = [
    onCommand("newNote", () => void notes().createNote()),
    onCommand("search", () => {
      view().setZen(false);
      focusSearch();
    }),
    onCommand("zenMode", () => view().setZen(!view().zen)),
    onCommand("showShortcuts", () => view().setShortcutsOpen(true)),
    onCommand("lockAll", () => void notes().lockNotes()),
    onCommand("nextNote", () => selectAdjacent(1)),
    onCommand("previousNote", () => selectAdjacent(-1)),
  ];
  return () => offs.forEach((off) => off());
}

/**
 * Keyboard shortcuts and menu commands, from the one KEYMAP: the native menu
 * sends commands over IPC, and the page answers the same keys itself (for
 * keys kept off the menu, and in tests). Escape leaves Zen mode.
 */
export function useCommands(): void {
  useEffect(() => {
    const mac = isMacPlatform();
    let last: { command: CommandId; at: number } | null = null;
    const run = (command: CommandId) => {
      const now = Date.now();
      if (last?.command === command && now - last.at < DUPLICATE_WINDOW_MS) return;
      last = { command, at: now };
      runCommand(command);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const { zen, shortcutsOpen, setZen } = useViewStore.getState();
      if (event.key === "Escape" && zen && !shortcutsOpen) {
        setZen(false);
        return;
      }
      const binding = KEYMAP.find((candidate) => matchesAccelerator(event, candidate.accelerator, mac));
      // Keys kept off the menu clash with text editing (⌘⌫), so they work only outside text.
      if (!binding || (!binding.inMenu && isTyping(event.target))) return;
      event.preventDefault();
      run(binding.command);
    };

    const offGlobal = registerGlobalCommands();
    const offMenu = subscribeToCommands(run);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      offGlobal();
      offMenu();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
