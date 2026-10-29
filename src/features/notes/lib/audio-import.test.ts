import { describe, expect, it } from "vitest";
import { importProblem, isAudioFile } from "@/features/notes/lib/audio-import";
import { am } from "@/lib/i18n/am";

describe("isAudioFile", () => {
  it("takes audio types, and recordings by extension when there is no type", () => {
    expect(isAudioFile({ name: "voice.ogg", type: "audio/ogg" })).toBe(true);
    expect(isAudioFile({ name: "ቃለ መጠይቅ.M4A", type: "" })).toBe(true);
    expect(isAudioFile({ name: "memo.opus", type: "" })).toBe(true);
  });

  it("refuses everything else", () => {
    expect(isAudioFile({ name: "notes.pdf", type: "application/pdf" })).toBe(false);
    expect(isAudioFile({ name: "README", type: "" })).toBe(false);
  });
});

describe("importProblem", () => {
  it("accepts a recording of a sensible length with sound in it", () => {
    expect(importProblem(95_000, 0.4)).toBeNull();
  });

  it("refuses one longer than 30 minutes, saying how long it is", () => {
    expect(importProblem(42 * 60_000)).toBe(
      "That recording is 42:00 long. Nota transcribes up to 30:00 at a time: split it first.",
    );
  });

  it("refuses one too short or silent", () => {
    expect(importProblem(100, 0.5)).toBe("That recording is too short to transcribe.");
    expect(importProblem(5000, 0)).toBe("That recording is silent: there is nothing to transcribe.");
  });

  it("lets an unknown length through to be measured after decoding", () => {
    expect(importProblem(Number.NaN)).toBeNull();
  });
});

describe("importProblem in Amharic", () => {
  it("names the length and the limit", () => {
    expect(importProblem(42 * 60_000, 1, am.errors.import)).toBe(
      "ቅጂው 42:00 ይረዝማል። Nota በአንድ ጊዜ እስከ 30:00 ድረስ ብቻ ወደ ጽሑፍ ይቀይራል፤ መጀመሪያ ይክፈሉት።",
    );
  });
});
