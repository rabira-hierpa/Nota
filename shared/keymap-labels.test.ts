import { describe, expect, it } from "vitest";
import { EDITOR_KEYS, KEYMAP } from "@shared/keymap";
import { commandLabel, commandWhen, editorKeyLabel, MENU_LABELS } from "@shared/keymap-labels";

const ETHIOPIC = /\p{Script=Ethiopic}/u;

describe("the keymap in Amharic", () => {
  it("names every command and editor key in Amharic, and keeps the English names", () => {
    for (const binding of KEYMAP) {
      expect(commandLabel(binding, "en")).toBe(binding.label);
      expect(commandLabel(binding, "am"), binding.command).toMatch(ETHIOPIC);
      if (binding.when) expect(commandWhen(binding, "am")).toMatch(ETHIOPIC);
    }
    for (const key of EDITOR_KEYS) expect(editorKeyLabel(key, "am"), key.id).toMatch(ETHIOPIC);
  });

  it("gives every menu-bar word in both languages", () => {
    expect(Object.keys(MENU_LABELS.am).sort()).toEqual(Object.keys(MENU_LABELS.en).sort());
    for (const word of Object.values(MENU_LABELS.am)) expect(word).toMatch(ETHIOPIC);
  });
});
