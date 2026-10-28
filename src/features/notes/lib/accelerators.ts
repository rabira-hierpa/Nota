/** The parts of a keyboard event a shortcut cares about. */
export interface KeyPress {
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

const MAC_SYMBOLS: Record<string, string> = {
  CmdOrCtrl: "⌘",
  Shift: "⇧",
  Alt: "⌥",
  Ctrl: "⌃",
  Backspace: "⌫",
  Up: "↑",
  Down: "↓",
  Escape: "Esc",
};

const OTHER_NAMES: Record<string, string> = {
  CmdOrCtrl: "Ctrl",
  Up: "↑",
  Down: "↓",
  Escape: "Esc",
};

/** Physical keys, so ⌥ (which changes the typed character on a Mac) doesn't break matching. */
const KEY_CODES: Record<string, string> = {
  "/": "Slash",
  ",": "Comma",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Backspace: "Backspace",
  Escape: "Escape",
};

const MODIFIERS = new Set(["CmdOrCtrl", "Shift", "Alt", "Ctrl"]);

function keyCode(key: string): string {
  if (KEY_CODES[key]) return KEY_CODES[key];
  if (/^[A-Z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^\d$/.test(key)) return `Digit${key}`;
  return key;
}

export function isMacPlatform(): boolean {
  return typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
}

/** "CmdOrCtrl+Shift+F" → "⌘⇧F" on a Mac, "Ctrl+Shift+F" elsewhere. */
export function formatAccelerator(accelerator: string, mac: boolean): string {
  const parts = accelerator.split("+");
  if (mac) return parts.map((part) => MAC_SYMBOLS[part] ?? part).join("");
  return parts.map((part) => OTHER_NAMES[part] ?? part).join("+");
}

/** Whether a key press is exactly this shortcut: same key, same modifiers, no extra ones. */
export function matchesAccelerator(press: KeyPress, accelerator: string, mac: boolean): boolean {
  const parts = accelerator.split("+");
  const key = parts.find((part) => !MODIFIERS.has(part));
  if (!key || press.code !== keyCode(key)) return false;
  const command = parts.includes("CmdOrCtrl");
  const wanted = {
    metaKey: mac && command,
    ctrlKey: (!mac && command) || parts.includes("Ctrl"),
    shiftKey: parts.includes("Shift"),
    altKey: parts.includes("Alt"),
  };
  return (
    press.metaKey === wanted.metaKey &&
    press.ctrlKey === wanted.ctrlKey &&
    press.shiftKey === wanted.shiftKey &&
    press.altKey === wanted.altKey
  );
}
