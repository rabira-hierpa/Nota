import { describe, expect, it } from "vitest";
import { formatDuration, formatRecordedAt } from "@/features/transcriber/lib/format";

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [999, "0:00"],
    [61_000, "1:01"],
    [754_000, "12:34"],
    [3_723_000, "1:02:03"],
    [-5, "0:00"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe("formatRecordedAt", () => {
  const now = new Date(2026, 9, 28, 12, 0);
  const at = (...parts: [number, number, number, number, number]) => new Date(...parts).toISOString();

  it("says Today and Yesterday for recent recordings", () => {
    expect(formatRecordedAt(at(2026, 9, 28, 9, 41), now)).toBe("Today, 09:41");
    expect(formatRecordedAt(at(2026, 9, 27, 18, 3), now)).toBe("Yesterday, 18:03");
  });

  it("shows the date, and the year only when it differs", () => {
    expect(formatRecordedAt(at(2026, 9, 20, 14, 0), now)).toBe("20 Oct, 14:00");
    expect(formatRecordedAt(at(2025, 2, 3, 8, 15), now)).toBe("3 Mar 2025, 08:15");
  });
});
