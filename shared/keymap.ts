import { z } from "zod";

/**
 * Every app command a shortcut or menu item can run. The main process builds
 * the native menu from KEYMAP and sends the command id to the renderer; the
 * renderer lists the same table in its shortcuts panel and also answers the
 * keys itself (for the few with no menu item, and where the menu can't see them).
 */
export const commandIdSchema = z.enum([
  "newNote",
  "search",
  "recordVoiceNote",
  "dictate",
  "zenMode",
  "toggleFavorite",
  "togglePinned",
  "toggleArchived",
  "toggleLocked",
  "lockAll",
  "exportNote",
  "moveToTrash",
  "showShortcuts",
  "openSettings",
  "nextNote",
  "previousNote",
]);
export type CommandId = z.infer<typeof commandIdSchema>;

export type KeyGroup = "Notes" | "Note" | "Voice" | "View";

export interface KeyBinding {
  command: CommandId;
  label: string;
  group: KeyGroup;
  /** Electron accelerator syntax ("CmdOrCtrl+Shift+F"). */
  accelerator: string;
  /** Shown in the native menu. Keys that would clash with text editing (⌘⌫) stay off it. */
  inMenu: boolean;
  /** When the key works, if not everywhere. */
  when?: string;
}

export const KEYMAP: readonly KeyBinding[] = [
  { command: "newNote", label: "New note", group: "Notes", accelerator: "CmdOrCtrl+N", inMenu: true },
  { command: "search", label: "Search notes", group: "Notes", accelerator: "CmdOrCtrl+F", inMenu: true },
  { command: "nextNote", label: "Next note", group: "Notes", accelerator: "CmdOrCtrl+Alt+Down", inMenu: true },
  { command: "previousNote", label: "Previous note", group: "Notes", accelerator: "CmdOrCtrl+Alt+Up", inMenu: true },
  { command: "toggleFavorite", label: "Add to or remove from Favorites", group: "Note", accelerator: "CmdOrCtrl+D", inMenu: true },
  { command: "togglePinned", label: "Pin or unpin", group: "Note", accelerator: "CmdOrCtrl+Shift+P", inMenu: true },
  { command: "toggleArchived", label: "Archive or unarchive", group: "Note", accelerator: "CmdOrCtrl+Shift+A", inMenu: true },
  { command: "toggleLocked", label: "Lock or unlock the note", group: "Note", accelerator: "CmdOrCtrl+Shift+L", inMenu: true },
  { command: "lockAll", label: "Lock all notes now", group: "Note", accelerator: "CmdOrCtrl+Alt+L", inMenu: true },
  { command: "exportNote", label: "Export…", group: "Note", accelerator: "CmdOrCtrl+Shift+E", inMenu: true },
  {
    command: "moveToTrash",
    label: "Move to Trash",
    group: "Note",
    accelerator: "CmdOrCtrl+Backspace",
    inMenu: false,
    when: "in the note list",
  },
  { command: "recordVoiceNote", label: "Record a voice note (again to stop)", group: "Voice", accelerator: "CmdOrCtrl+Shift+R", inMenu: true },
  { command: "dictate", label: "Dictate into the note (again to stop)", group: "Voice", accelerator: "CmdOrCtrl+Shift+D", inMenu: true },
  { command: "zenMode", label: "Zen mode", group: "View", accelerator: "CmdOrCtrl+Shift+F", inMenu: true },
  { command: "showShortcuts", label: "Keyboard shortcuts", group: "View", accelerator: "CmdOrCtrl+/", inMenu: true },
  { command: "openSettings", label: "Settings…", group: "View", accelerator: "CmdOrCtrl+,", inMenu: true },
];

/** The editor's own keys (Tiptap), listed for reference; the editor handles them. */
export const EDITOR_KEYS: readonly { label: string; accelerator: string }[] = [
  { label: "Bold", accelerator: "CmdOrCtrl+B" },
  { label: "Italic", accelerator: "CmdOrCtrl+I" },
  { label: "Underline", accelerator: "CmdOrCtrl+U" },
  { label: "Strikethrough", accelerator: "CmdOrCtrl+Shift+S" },
  { label: "Highlight", accelerator: "CmdOrCtrl+Shift+H" },
  { label: "Inline code", accelerator: "CmdOrCtrl+E" },
  { label: "Heading 1, 2, 3", accelerator: "CmdOrCtrl+Alt+1" },
  { label: "Body text", accelerator: "CmdOrCtrl+Alt+0" },
  { label: "Numbered list", accelerator: "CmdOrCtrl+Shift+7" },
  { label: "Bulleted list", accelerator: "CmdOrCtrl+Shift+8" },
  { label: "Checklist", accelerator: "CmdOrCtrl+Shift+9" },
  { label: "Quote", accelerator: "CmdOrCtrl+Shift+B" },
  { label: "Code block", accelerator: "CmdOrCtrl+Alt+C" },
  { label: "Undo", accelerator: "CmdOrCtrl+Z" },
  { label: "Redo", accelerator: "CmdOrCtrl+Shift+Z" },
  { label: "Leave Zen mode", accelerator: "Escape" },
];
