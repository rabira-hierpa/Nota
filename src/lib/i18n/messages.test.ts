import { describe, expect, it } from "vitest";
import { am } from "@/lib/i18n/am";
import { en } from "@/lib/i18n/en";
import { DESKTOP_ERRORS } from "@/lib/desktop";
import { amharicMessages, ENGINE_MESSAGES, HANDLER_ERRORS } from "@shared/messages";

const ETHIOPIC = /\p{Script=Ethiopic}/u;

type Leaf = { path: string; value: string };

/** Every string in a message tree, functions called with sample values. */
function leaves(tree: object, path = ""): Leaf[] {
  return Object.entries(tree).flatMap(([key, value]): Leaf[] => {
    const here = path ? `${path}.${key}` : key;
    if (typeof value === "string") return [{ path: here, value }];
    if (typeof value === "function") return key === "translate" ? [] : [{ path: here, value: String(value("x", 2)) }];
    if (Array.isArray(value)) return value.map((item, index) => ({ path: `${here}.${index}`, value: String(item) }));
    return value && typeof value === "object" ? leaves(value, here) : [];
  });
}

/** Words that are the same in both languages: names, formats and symbols. */
const SAME_IN_BOTH = new Set([
  "menu.markdown",
  "models.voicestudio.option",
  "models.buzzasr.option",
]);

describe("the Amharic messages", () => {
  it("have something for every English one, in Ge'ez", () => {
    const english = new Map(leaves(en).map(({ path, value }) => [path, value]));
    const amharic = leaves(am);
    expect(amharic.map(({ path }) => path).sort()).toEqual([...english.keys()].sort());
    for (const { path, value } of amharic) {
      if (SAME_IN_BOTH.has(path) || path.startsWith("dates.")) continue;
      expect(value, path).toMatch(ETHIOPIC);
    }
  });

  it("translate every message the main process sends, by its English wording", () => {
    const arriving = [
      ...Object.values(HANDLER_ERRORS),
      ...Object.values(ENGINE_MESSAGES),
      ...Object.values(DESKTOP_ERRORS),
      ...Object.values(amharicMessages("hohe")),
      ...Object.values(amharicMessages("buzzasr")),
    ];
    for (const message of arriving) expect(am.translate(message), message).toMatch(ETHIOPIC);
    expect(am.translate(amharicMessages("hohe").notSetUp)).toContain("Hohe");
    expect(am.translate("VoiceStudio answered with HTTP 503.")).toBe("VoiceStudio በHTTP 503 መለሰ።");
  });

  it("leave text they don't know as it is, and English leaves everything", () => {
    expect(am.translate("ሰላም ዓለም")).toBe("ሰላም ዓለም");
    expect(en.translate(HANDLER_ERRORS.generic)).toBe(HANDLER_ERRORS.generic);
  });

  it("translate the detail of a dictation clip that failed", () => {
    expect(am.errors.clipFailed(HANDLER_ERRORS.generic)).toBe(
      "ከተናገሩት ከፊሉን ወደ ጽሑፍ መቀየር አልተቻለም። የሆነ ችግር ተፈጥሯል። እንደገና ይሞክሩ።",
    );
  });
});
