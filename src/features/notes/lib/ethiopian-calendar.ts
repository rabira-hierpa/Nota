/**
 * The Ethiopian calendar: twelve months of 30 days and Pagume, a thirteenth
 * of 5 days (6 in the year before a Gregorian leap year). The year begins on
 * 11 September (12 September before a Gregorian leap year) and runs 7 or 8
 * years behind the Gregorian one. Converted through the Julian day number.
 */

export interface EthiopianDate {
  year: number;
  /** 1 (Meskerem) … 13 (Pagume). */
  month: number;
  day: number;
}

export const ETHIOPIAN_MONTHS = [
  "መስከረም",
  "ጥቅምት",
  "ኅዳር",
  "ታኅሣሥ",
  "ጥር",
  "የካቲት",
  "መጋቢት",
  "ሚያዝያ",
  "ግንቦት",
  "ሰኔ",
  "ሐምሌ",
  "ነሐሴ",
  "ጳጉሜ",
] as const;

/** Julian day number of 1 Meskerem, year 1 (Amete Mihret). */
const EPOCH_JDN = 1_724_221;
/** Julian day number of 1 January 1970. */
const UNIX_EPOCH_JDN = 2_440_588;
const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;
const DAYS_PER_MONTH = 30;
const DAYS_PER_FOUR_YEARS = 1461;

function jdnFromEthiopian(year: number, month: number, day: number): number {
  return EPOCH_JDN - 1 + DAYS_PER_YEAR * (year - 1) + Math.floor(year / 4) + DAYS_PER_MONTH * (month - 1) + day;
}

/** The calendar day of `date` in the computer's time zone, as a Julian day number. */
function localJdn(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY) + UNIX_EPOCH_JDN;
}

/** The Ethiopian date of the day `date` falls on, where the computer is. */
export function toEthiopian(date: Date): EthiopianDate {
  const jdn = localJdn(date);
  const year = Math.floor((4 * (jdn - EPOCH_JDN) + 1463) / DAYS_PER_FOUR_YEARS);
  const month = Math.floor((jdn - jdnFromEthiopian(year, 1, 1)) / DAYS_PER_MONTH) + 1;
  const day = jdn + 1 - jdnFromEthiopian(year, month, 1);
  return { year, month, day };
}

/** "ጥቅምት 20", with ", 2019" when asked for the year (or "፣ 2019" in an Amharic interface). */
export function formatEthiopianDate({ year, month, day }: EthiopianDate, withYear: boolean, comma = ", "): string {
  const date = `${ETHIOPIAN_MONTHS[month - 1]} ${day}`;
  return withYear ? `${date}${comma}${year}` : date;
}
