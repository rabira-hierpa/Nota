import { app, Menu } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import { KEYMAP } from "@shared/keymap";
import type { CommandId, KeyGroup } from "@shared/keymap";

/** Which native menu each group of commands lives in. */
const MENU_TITLES: Record<KeyGroup, string> = {
  Notes: "File",
  Voice: "File",
  Note: "Note",
  View: "View",
};

function commandItems(groups: KeyGroup[], send: (command: CommandId) => void): MenuItemConstructorOptions[] {
  return KEYMAP.filter((binding) => binding.inMenu && groups.includes(binding.group)).map((binding) => ({
    label: binding.label,
    accelerator: binding.accelerator,
    click: () => send(binding.command),
  }));
}

/**
 * The app's menu bar, built from the shared KEYMAP so the menu, the
 * renderer's shortcuts panel and the keys themselves never disagree. Choosing
 * an item sends its command to the renderer. Standard Edit items keep text
 * editing (copy, paste, undo) working.
 */
export function buildAppMenu(send: (command: CommandId) => void, { development }: { development: boolean }): Menu {
  const isMac = process.platform === "darwin";
  const settings = commandItems(["View"], send).find((item) => item.label === "Settings…");
  const viewItems = commandItems(["View"], send).filter((item) => item !== settings);

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              ...(settings ? [settings] : []),
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: MENU_TITLES.Notes,
      submenu: [
        ...commandItems(["Notes"], send),
        { type: "separator" },
        ...commandItems(["Voice"], send),
        ...(isMac ? [] : [{ type: "separator" as const }, ...(settings ? [settings] : []), { role: "quit" as const }]),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "selectAll" },
      ],
    },
    { label: MENU_TITLES.Note, submenu: commandItems(["Note"], send) },
    {
      label: MENU_TITLES.View,
      submenu: [
        ...viewItems,
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(development ? [{ type: "separator" as const }, { role: "reload" as const }, { role: "toggleDevTools" as const }] : []),
      ],
    },
    { role: "windowMenu" },
  ];
  return Menu.buildFromTemplate(template);
}
