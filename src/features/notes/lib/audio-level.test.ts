import { describe, expect, it } from "vitest";
import { peakLevel, SILENT_PEAK } from "@/features/notes/lib/audio-level";

describe("peakLevel", () => {
  it("is 0 for digital silence, below the silence threshold", () => {
    const silence = new Float32Array(16_000);
    expect(peakLevel(silence)).toBe(0);
    expect(peakLevel(silence)).toBeLessThan(SILENT_PEAK);
  });

  it("finds the loudest sample in either direction", () => {
    expect(peakLevel(new Float32Array([0.01, -0.4, 0.2]))).toBeCloseTo(0.4);
  });

  it("keeps a quiet real room above the threshold", () => {
    // The built-in mic in a quiet room peaked at ~0.011 during diagnosis.
    expect(peakLevel(new Float32Array([0, 0.011, -0.006]))).toBeGreaterThan(SILENT_PEAK);
  });
});
