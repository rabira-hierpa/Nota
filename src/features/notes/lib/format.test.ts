import { describe, expect, it } from "vitest";
import { formatDateTime, formatDuration, formatFullDate, formatListDate } from "@/features/notes/lib/format";
import { am } from "@/lib/i18n/am";
import { en } from "@/lib/i18n/en";

const words = en.dates;

const now = new Date(2026, 9, 28, 12, 0);
const at = (...parts: [number, number, number, number, number]) => new Date(...parts).toISOString();

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

describe("formatDateTime", () => {
  it("says Today and Yesterday for recent notes, in any calendar", () => {
    expect(formatDateTime(at(2026, 9, 28, 9, 41), "gregorian", words, now)).toBe("Today, 09:41");
    expect(formatDateTime(at(2026, 9, 27, 18, 3), "ethiopian", words, now)).toBe("Yesterday, 18:03");
  });

  it("shows the date, and the year only when it differs", () => {
    expect(formatDateTime(at(2026, 9, 20, 14, 0), "gregorian", words, now)).toBe("20 Oct, 14:00");
    expect(formatDateTime(at(2025, 2, 3, 8, 15), "gregorian", words, now)).toBe("3 Mar 2025, 08:15");
  });

  it("shows the Ethiopian date, or both side by side", () => {
    expect(formatDateTime(at(2026, 9, 20, 14, 0), "ethiopian", words, now)).toBe("ጥቅምት 10, 14:00");
    expect(formatDateTime(at(2026, 9, 20, 14, 0), "both", words, now)).toBe("20 Oct · ጥቅምት 10, 14:00");
  });

  it("counts years by the Ethiopian new year (11 September), not 1 January", () => {
    // 2019 began on 11 September 2026: a note from August is from last year.
    expect(formatDateTime(at(2026, 7, 20, 9, 0), "ethiopian", words, now)).toBe("ነሐሴ 14, 2018, 09:00");
    expect(formatDateTime(at(2026, 8, 20, 9, 0), "ethiopian", words, now)).toBe("መስከረም 10, 09:00");
  });
});

describe("formatListDate", () => {
  it("shows the time today, then Yesterday, then the date", () => {
    expect(formatListDate(at(2026, 9, 28, 9, 41), "gregorian", words, now)).toBe("09:41");
    expect(formatListDate(at(2026, 9, 27, 18, 3), "gregorian", words, now)).toBe("Yesterday");
    expect(formatListDate(at(2026, 9, 20, 14, 0), "gregorian", words, now)).toBe("20 Oct");
    expect(formatListDate(at(2025, 2, 3, 8, 15), "gregorian", words, now)).toBe("3 Mar 2025");
  });

  it("uses the chosen calendar", () => {
    expect(formatListDate(at(2026, 9, 20, 14, 0), "ethiopian", words, now)).toBe("ጥቅምት 10");
    expect(formatListDate(at(2025, 2, 3, 8, 15), "both", words, now)).toBe("3 Mar 2025 · የካቲት 24, 2017");
  });
});

describe("formatFullDate", () => {
  const iso = at(2026, 9, 30, 9, 41);

  it("gives one line per calendar", () => {
    expect(formatFullDate(iso, "gregorian", words)).toEqual(["Fri, 30 Oct 2026, 09:41"]);
    expect(formatFullDate(iso, "ethiopian", words)).toEqual(["ጥቅምት 20, 2019 ዓ.ም., 09:41"]);
    expect(formatFullDate(iso, "both", words)).toEqual(["Fri, 30 Oct 2026, 09:41", "ጥቅምት 20, 2019 ዓ.ም."]);
  });
});

describe("in Amharic", () => {
  it("says ዛሬ and ትናንት, and names Gregorian months in Amharic", () => {
    expect(formatDateTime(at(2026, 9, 28, 9, 41), "gregorian", am.dates, now)).toBe("ዛሬ፣ 09:41");
    expect(formatListDate(at(2026, 9, 27, 18, 3), "gregorian", am.dates, now)).toBe("ትናንት");
    expect(formatListDate(at(2026, 9, 20, 14, 0), "gregorian", am.dates, now)).toBe("ኦክቶ 20");
    expect(formatListDate(at(2026, 9, 20, 14, 0), "ethiopian", am.dates, now)).toBe("ጥቅምት 10");
  });

  it("keeps a 24-hour clock", () => {
    expect(formatDateTime(at(2026, 9, 28, 18, 3), "ethiopian", am.dates, now)).toBe("ዛሬ፣ 18:03");
  });
});
