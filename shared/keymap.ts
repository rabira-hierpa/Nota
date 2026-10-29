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
  "importAudio",
  "dictate",
  "zenMode",
  "toggleSidebar",
  "noteInfo",
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
  { command: "noteInfo", label: "Note info and statistics", group: "Note", accelerator: "CmdOrCtrl+Shift+I", inMenu: true },
  {
    command: "moveToTrash",
    label: "Move to Trash",
    group: "Note",
    accelerator: "CmdOrCtrl+Backspace",
    inMenu: false,
    when: "in the note list",
  },
  { command: "recordVoiceNote", label: "Record a voice note (again to stop)", group: "Voice", accelerator: "CmdOrCtrl+Shift+R", inMenu: true },
  { command: "importAudio", label: "Transcribe a recording…", group: "Voice", accelerator: "CmdOrCtrl+Shift+O", inMenu: true },
  { command: "dictate", label: "Dictate into the note (again to stop)", group: "Voice", accelerator: "CmdOrCtrl+Shift+D", inMenu: true },
  { command: "toggleSidebar", label: "Show or hide the sidebar", group: "View", accelerator: "CmdOrCtrl+Alt+S", inMenu: true },
  { command: "zenMode", label: "Zen mode", group: "View", accelerator: "CmdOrCtrl+Shift+F", inMenu: true },
  { command: "showShortcuts", label: "Keyboard shortcuts", group: "View", accelerator: "CmdOrCtrl+/", inMenu: true },
  { command: "openSettings", label: "Settings…", group: "View", accelerator: "CmdOrCtrl+,", inMenu: true },
];

export type EditorKeyId =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "highlight"
  | "code"
  | "heading"
  | "paragraph"
  | "orderedList"
  | "bulletList"
  | "taskList"
  | "quote"
  | "codeBlock"
  | "undo"
  | "redo"
  | "leaveZen";

/** The editor's own keys (Tiptap), listed for reference; the editor handles them. */
export const EDITOR_KEYS: readonly { id: EditorKeyId; label: string; accelerator: string }[] = [
  { id: "bold", label: "Bold", accelerator: "CmdOrCtrl+B" },
  { id: "italic", label: "Italic", accelerator: "CmdOrCtrl+I" },
  { id: "underline", label: "Underline", accelerator: "CmdOrCtrl+U" },
  { id: "strike", label: "Strikethrough", accelerator: "CmdOrCtrl+Shift+S" },
  { id: "highlight", label: "Highlight", accelerator: "CmdOrCtrl+Shift+H" },
  { id: "code", label: "Inline code", accelerator: "CmdOrCtrl+E" },
  { id: "heading", label: "Heading 1, 2, 3", accelerator: "CmdOrCtrl+Alt+1" },
  { id: "paragraph", label: "Body text", accelerator: "CmdOrCtrl+Alt+0" },
  { id: "orderedList", label: "Numbered list", accelerator: "CmdOrCtrl+Shift+7" },
  { id: "bulletList", label: "Bulleted list", accelerator: "CmdOrCtrl+Shift+8" },
  { id: "taskList", label: "Checklist", accelerator: "CmdOrCtrl+Shift+9" },
  { id: "quote", label: "Quote", accelerator: "CmdOrCtrl+Shift+B" },
  { id: "codeBlock", label: "Code block", accelerator: "CmdOrCtrl+Alt+C" },
  { id: "undo", label: "Undo", accelerator: "CmdOrCtrl+Z" },
  { id: "redo", label: "Redo", accelerator: "CmdOrCtrl+Shift+Z" },
  { id: "leaveZen", label: "Leave Zen mode", accelerator: "Escape" },
];
