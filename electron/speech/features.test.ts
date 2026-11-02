import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FEATURE_SIZE, hoheFeatures, MIN_SAMPLES } from "@main/speech/features";
import { fromBase64, readFixture } from "@main/speech/fixtures";

const fixture = readFixture(
  "features.json",
  z.object({ samples: z.string(), dims: z.tuple([z.number(), z.number(), z.number()]), features: z.string() }),
);

describe("hoheFeatures", () => {
  it("match transformers' SeamlessM4TFeatureExtractor, padding frame included", () => {
    const samples = new Int16Array(fromBase64(fixture.samples));
    const expected = new Float32Array(fromBase64(fixture.features));
    const { data, steps } = hoheFeatures(samples);

    expect([1, steps, FEATURE_SIZE]).toEqual(fixture.dims);
    expect(data).toHaveLength(expected.length);
    let largest = 0;
    for (let i = 0; i < data.length; i++) largest = Math.max(largest, Math.abs(data[i] - expected[i]));
    expect(largest).toBeLessThan(1e-4);
  });

  it("make one step per two frames", () => {
    // Two frames exactly: 400 samples, then one more hop of 160.
    expect(hoheFeatures(new Int16Array(MIN_SAMPLES).map((_, i) => (i % 7) * 100)).steps).toBe(1);
  });
});
