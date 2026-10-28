import { describe, expect, it } from "vitest";
import { cleanTranscript } from "@main/lib/clean-transcript";

describe("cleanTranscript", () => {
  it("drops the replacement characters Whisper emits for half-decoded Ge'ez", () => {
    // Seen from Whisper large-v3 on a real Amharic recording.
    const broken = String.fromCodePoint(0xfffd);
    expect(cleanTranscript(` ኢትዮያ እው${broken}ች  ንገር አ${broken}`)).toBe("ኢትዮያ እውች ንገር አ");
  });

  it("collapses whitespace and leaves clean text alone", () => {
    expect(cleanTranscript("ሰላም\n  ዓለም")).toBe("ሰላም ዓለም");
  });
});
