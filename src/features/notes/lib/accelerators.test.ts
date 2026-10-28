import { describe, expect, it } from "vitest";
import { formatAccelerator, matchesAccelerator } from "@/features/notes/lib/accelerators";
import type { KeyPress } from "@/features/notes/lib/accelerators";
import { KEYMAP } from "@shared/keymap";

const press = (code: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  code,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

describe("formatAccelerator", () => {
  it("uses symbols on a Mac and names elsewhere", () => {
    expect(formatAccelerator("CmdOrCtrl+Shift+F", true)).toBe("⌘⇧F");
    expect(formatAccelerator("CmdOrCtrl+Alt+Up", true)).toBe("⌘⌥↑");
    expect(formatAccelerator("CmdOrCtrl+Shift+F", false)).toBe("Ctrl+Shift+F");
  });
});

describe("matchesAccelerator", () => {
  it("matches the physical key with exactly the right modifiers", () => {
    expect(matchesAccelerator(press("KeyF", { metaKey: true, shiftKey: true }), "CmdOrCtrl+Shift+F", true)).toBe(true);
    expect(matchesAccelerator(press("KeyF", { metaKey: true }), "CmdOrCtrl+Shift+F", true)).toBe(false);
    expect(matchesAccelerator(press("KeyF", { ctrlKey: true, shiftKey: true }), "CmdOrCtrl+Shift+F", false)).toBe(true);
    // ⌥ changes the typed character on a Mac, not the key code.
    expect(matchesAccelerator(press("KeyL", { metaKey: true, altKey: true }), "CmdOrCtrl+Alt+L", true)).toBe(true);
    expect(matchesAccelerator(press("Slash", { metaKey: true }), "CmdOrCtrl+/", true)).toBe(true);
  });
});

describe("KEYMAP", () => {
  it("never gives two commands the same keys", () => {
    const keys = KEYMAP.map((binding) => binding.accelerator);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
