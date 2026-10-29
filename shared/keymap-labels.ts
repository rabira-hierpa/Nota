import { KEYMAP } from "@shared/keymap";
import type { CommandId, EditorKeyId, KeyBinding, KeyGroup } from "@shared/keymap";
import type { Locale } from "@shared/types/locale";

/**
 * The keymap and the menu bar in Amharic. English is the keymap's own
 * `label`; the native menu (main) and the shortcuts panel (renderer) both
 * read their words from here, so they always agree.
 */

const COMMANDS_AM: Record<CommandId, string> = {
  newNote: "አዲስ ማስታወሻ",
  search: "ማስታወሻዎችን ፈልግ",
  nextNote: "ቀጣዩ ማስታወሻ",
  previousNote: "ያለፈው ማስታወሻ",
  toggleFavorite: "ወደ ተወዳጆች አክል ወይም አስወግድ",
  togglePinned: "ከላይ ሰካ ወይም ንቀል",
  toggleArchived: "ወደ ማህደር አስገባ ወይም አውጣ",
  toggleLocked: "ማስታወሻውን ቆልፍ ወይም ክፈት",
  lockAll: "ሁሉንም ማስታወሻዎች አሁን ቆልፍ",
  exportNote: "ወደ ውጭ ላክ…",
  noteInfo: "የማስታወሻው መረጃ እና ቁጥሮች",
  moveToTrash: "ወደ መጣያ ውሰድ",
  recordVoiceNote: "የድምፅ ማስታወሻ ቅረጽ (ለማቆም እንደገና)",
  importAudio: "ቅጂን ወደ ጽሑፍ ቀይር…",
  dictate: "በማስታወሻው ውስጥ በድምፅ ጻፍ (ለማቆም እንደገና)",
  toggleSidebar: "የጎን አሞሌውን አሳይ ወይም ደብቅ",
  zenMode: "የትኩረት ሁነታ",
  showShortcuts: "የቁልፍ ሰሌዳ አቋራጮች",
  openSettings: "ቅንብሮች…",
};

const WHEN_AM: Partial<Record<CommandId, string>> = {
  moveToTrash: "በማስታወሻ ዝርዝሩ ውስጥ",
};

const EDITOR_KEYS_AM: Record<EditorKeyId, string> = {
  bold: "ደማቅ",
  italic: "ሰያፍ",
  underline: "ከስር አስምር",
  strike: "በላይ ሰርዝ",
  highlight: "አድምቅ",
  code: "በመስመር ውስጥ ኮድ",
  heading: "ርዕስ 1፣ 2፣ 3",
  paragraph: "መደበኛ ጽሑፍ",
  orderedList: "ቁጥር ያለው ዝርዝር",
  bulletList: "ነጥብ ያለው ዝርዝር",
  taskList: "የማረጋገጫ ዝርዝር",
  quote: "ጥቅስ",
  codeBlock: "የኮድ ክፍል",
  undo: "ቀልብስ",
  redo: "ድገም",
  leaveZen: "ከትኩረት ሁነታ ውጣ",
};

export type ShortcutGroup = KeyGroup | "Writing";

export const GROUP_LABELS: Record<Locale, Record<ShortcutGroup, string>> = {
  en: { Notes: "Notes", Note: "Note", Voice: "Voice", View: "View", Writing: "Writing" },
  am: { Notes: "ማስታወሻዎች", Note: "ማስታወሻ", Voice: "ድምፅ", View: "እይታ", Writing: "መጻፍ" },
};

/** The menu bar's own words: its menus, and the standard items Electron provides. */
export interface MenuLabels {
  file: string;
  edit: string;
  note: string;
  view: string;
  window: string;
  about: string;
  hide: string;
  hideOthers: string;
  unhide: string;
  quit: string;
  undo: string;
  redo: string;
  cut: string;
  copy: string;
  paste: string;
  pasteAndMatchStyle: string;
  selectAll: string;
  toggleFullScreen: string;
  reload: string;
  toggleDevTools: string;
}

export const MENU_LABELS: Record<Locale, MenuLabels> = {
  en: {
    file: "File",
    edit: "Edit",
    note: "Note",
    view: "View",
    window: "Window",
    about: "About Nota",
    hide: "Hide Nota",
    hideOthers: "Hide Others",
    unhide: "Show All",
    quit: "Quit Nota",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    pasteAndMatchStyle: "Paste and Match Style",
    selectAll: "Select All",
    toggleFullScreen: "Toggle Full Screen",
    reload: "Reload",
    toggleDevTools: "Toggle Developer Tools",
  },
  am: {
    file: "ፋይል",
    edit: "አርትዕ",
    note: "ማስታወሻ",
    view: "እይታ",
    window: "መስኮት",
    about: "ስለ Nota",
    hide: "Notaን ደብቅ",
    hideOthers: "ሌሎቹን ደብቅ",
    unhide: "ሁሉንም አሳይ",
    quit: "ከNota ውጣ",
    undo: "ቀልብስ",
    redo: "ድገም",
    cut: "ቁረጥ",
    copy: "ቅዳ",
    paste: "ለጥፍ",
    pasteAndMatchStyle: "ቅርጹን አስማምተህ ለጥፍ",
    selectAll: "ሁሉንም ምረጥ",
    toggleFullScreen: "ሙሉ ማያ ገጽ",
    reload: "እንደገና ጫን",
    toggleDevTools: "የገንቢ መሣሪያዎች",
  },
};

/** A command's name in the menu and the shortcuts panel. */
export function commandLabel(binding: KeyBinding, locale: Locale): string {
  return locale === "am" ? COMMANDS_AM[binding.command] : binding.label;
}

/** When a shortcut works, if not everywhere ("in the note list"). */
export function commandWhen(binding: KeyBinding, locale: Locale): string | undefined {
  return locale === "am" ? WHEN_AM[binding.command] : binding.when;
}

export function editorKeyLabel(key: { id: EditorKeyId; label: string }, locale: Locale): string {
  return locale === "am" ? EDITOR_KEYS_AM[key.id] : key.label;
}

/** The binding for a command (every command has one). */
export function bindingFor(command: CommandId): KeyBinding | undefined {
  return KEYMAP.find((binding) => binding.command === command);
}
