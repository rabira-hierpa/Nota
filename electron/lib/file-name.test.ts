import { describe, expect, it } from "vitest";
import { safeFileName } from "@main/lib/file-name";

describe("safeFileName", () => {
  it("keeps Amharic and drops characters files can't hold", () => {
    expect(safeFileName("ስብሰባ: 3/10 <draft>?")).toBe("ስብሰባ 3 10 draft");
  });

  it("never starts with a dot or escapes the folder", () => {
    expect(safeFileName("../../etc/passwd")).toBe("etc passwd");
    expect(safeFileName(".hidden")).toBe("hidden");
  });

  it("falls back to a name when nothing is left", () => {
    expect(safeFileName("  /// ")).toBe("Note");
  });
});
