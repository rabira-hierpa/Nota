import { describe, expect, it } from "vitest";
import { splitAtPauses } from "@main/speech/split-at-pauses";
import { SAMPLE_RATE } from "@main/speech/wav";

/** Equally loud everywhere (every 100 ms has the same energy) except quiet stretches, [start, end) in seconds. */
function speech(seconds: number, quiet: readonly [number, number][]): Int16Array {
  return new Int16Array(seconds * SAMPLE_RATE).map((_, i) => {
    const t = i / SAMPLE_RATE;
    return quiet.some(([from, to]) => t >= from && t < to) ? 0 : (i % 2) * 16_000 - 8000;
  });
}

describe("splitAtPauses", () => {
  it("leaves 30 s or less whole", () => {
    const audio = speech(30, []);
    expect(splitAtPauses(audio)).toEqual([audio]);
  });

  it("cuts in the middle of the quietest 100 ms of each window's last 5 s", () => {
    const pieces = splitAtPauses(speech(70, [[27.2, 27.3]]));
    // The first window's pause is at 27.2–27.3 s: cut at 27.25 s. The next window ends at 57.25 s
    // with no pause, so it cuts in the first frame of its search (52.25–52.35 s), at 52.30 s.
    expect(pieces.map((piece) => piece.length / SAMPLE_RATE)).toEqual([27.25, 25.05, 17.7]);
  });

  it("keeps every sample, in order", () => {
    const audio = speech(95, [[28, 28.5], [55, 55.2]]);
    const pieces = splitAtPauses(audio);
    expect(pieces.reduce((sum, piece) => sum + piece.length, 0)).toBe(audio.length);
    expect(pieces.every((piece) => piece.length <= 30 * SAMPLE_RATE)).toBe(true);
  });

  it("gives nothing for no audio", () => {
    expect(splitAtPauses(new Int16Array(0))).toEqual([]);
  });
});
