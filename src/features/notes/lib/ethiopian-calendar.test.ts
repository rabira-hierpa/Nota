import { describe, expect, it } from "vitest";
import { formatEthiopianDate, toEthiopian } from "@/features/notes/lib/ethiopian-calendar";

describe("toEthiopian", () => {
  it.each([
    // The millennium, after a leap year (Pagume 6): 12 September.
    [new Date(2007, 8, 12), { year: 2000, month: 1, day: 1 }],
    [new Date(2023, 8, 11), { year: 2015, month: 13, day: 6 }],
    [new Date(2023, 8, 12), { year: 2016, month: 1, day: 1 }],
    // An ordinary new year: 11 September.
    [new Date(2026, 8, 11), { year: 2019, month: 1, day: 1 }],
    [new Date(2026, 8, 10), { year: 2018, month: 13, day: 5 }],
    [new Date(2026, 9, 30), { year: 2019, month: 2, day: 20 }],
    // Genna (Ethiopian Christmas) and Timket.
    [new Date(2025, 0, 7), { year: 2017, month: 4, day: 29 }],
    [new Date(2026, 0, 19), { year: 2018, month: 5, day: 11 }],
    // Adwa Victory Day, in a Gregorian leap year.
    [new Date(2024, 2, 2), { year: 2016, month: 6, day: 23 }],
  ])("%s → %o", (date, expected) => {
    expect(toEthiopian(date)).toEqual(expected);
  });

  it("reads the day where the computer is, at any hour", () => {
    expect(toEthiopian(new Date(2026, 9, 30, 0, 0))).toEqual(toEthiopian(new Date(2026, 9, 30, 23, 59)));
  });
});

describe("formatEthiopianDate", () => {
  it("names the month in Amharic", () => {
    expect(formatEthiopianDate({ year: 2019, month: 2, day: 20 }, false)).toBe("ጥቅምት 20");
    expect(formatEthiopianDate({ year: 2015, month: 13, day: 6 }, true)).toBe("ጳጉሜ 6, 2015");
  });
});
