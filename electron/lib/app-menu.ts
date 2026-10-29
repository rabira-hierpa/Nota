import { app, Menu } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import { KEYMAP } from "@shared/keymap";
import type { CommandId, KeyBinding, KeyGroup } from "@shared/keymap";
import { commandLabel, MENU_LABELS } from "@shared/keymap-labels";
import type { Locale } from "@shared/types/locale";

/** Settings sits in the app menu on a Mac (in File elsewhere), not in View with the rest of its group. */
const SETTINGS: CommandId = "openSettings";

function menuItem(binding: KeyBinding, send: (command: CommandId) => void, locale: Locale): MenuItemConstructorOptions {
  return { label: commandLabel(binding, locale), accelerator: binding.accelerator, click: () => send(binding.command) };
}

function commandItems(groups: KeyGroup[], send: (command: CommandId) => void, locale: Locale): MenuItemConstructorOptions[] {
  return KEYMAP.filter((binding) => binding.inMenu && groups.includes(binding.group) && binding.command !== SETTINGS).map(
    (binding) => menuItem(binding, send, locale),
  );
}

interface MenuOptions {
  development: boolean;
  /** The interface's language, chosen in Settings. */
  locale: Locale;
}

/**
 * The app's menu bar, built from the shared KEYMAP so the menu, the
 * renderer's shortcuts panel and the keys themselves never disagree. Choosing
 * an item sends its command to the renderer. Standard Edit items keep text
 * editing (copy, paste, undo) working. Rebuilt when the language changes.
 */
export function buildAppMenu(send: (command: CommandId) => void, { development, locale }: MenuOptions): Menu {
  const isMac = process.platform === "darwin";
  const words = MENU_LABELS[locale];
  const settings = KEYMAP.filter((binding) => binding.command === SETTINGS).map((binding) => menuItem(binding, send, locale));

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const, label: words.about },
              { type: "separator" as const },
              ...settings,
              { type: "separator" as const },
              { role: "hide" as const, label: words.hide },
              { role: "hideOthers" as const, label: words.hideOthers },
              { role: "unhide" as const, label: words.unhide },
              { type: "separator" as const },
              { role: "quit" as const, label: words.quit },
            ],
          },
        ]
      : []),
    {
      label: words.file,
      submenu: [
        ...commandItems(["Notes"], send, locale),
        { type: "separator" },
        ...commandItems(["Voice"], send, locale),
        ...(isMac ? [] : [{ type: "separator" as const }, ...settings, { role: "quit" as const, label: words.quit }]),
      ],
    },
    {
      label: words.edit,
      submenu: [
        { role: "undo", label: words.undo },
        { role: "redo", label: words.redo },
        { type: "separator" },
        { role: "cut", label: words.cut },
        { role: "copy", label: words.copy },
        { role: "paste", label: words.paste },
        { role: "pasteAndMatchStyle", label: words.pasteAndMatchStyle },
        { role: "selectAll", label: words.selectAll },
      ],
    },
    { label: words.note, submenu: commandItems(["Note"], send, locale) },
    {
      label: words.view,
      submenu: [
        ...commandItems(["View"], send, locale),
        { type: "separator" },
        { role: "togglefullscreen", label: words.toggleFullScreen },
        ...(development
          ? [
              { type: "separator" as const },
              { role: "reload" as const, label: words.reload },
              { role: "toggleDevTools" as const, label: words.toggleDevTools },
            ]
          : []),
      ],
    },
    { role: "windowMenu", label: words.window },
  ];
  return Menu.buildFromTemplate(template);
}
