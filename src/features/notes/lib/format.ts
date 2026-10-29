import { formatEthiopianDate, toEthiopian } from "@/features/notes/lib/ethiopian-calendar";
import type { Messages } from "@/lib/i18n";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/** Which calendar dates are shown in (Settings → Dates). */
export type CalendarChoice = "gregorian" | "ethiopian" | "both";

/** The words a date needs, in the interface's language. */
export type DateWords = Messages["dates"];

/** 754000 → "12:34"; 3_723_000 → "1:02:03". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MS_PER_SECOND));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = String(total % SECONDS_PER_MINUTE).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/**
 * "Today, 09:41", "Yesterday, 18:03", then the date: "27 Oct, 14:00" (Gregorian),
 * "ጥቅምት 17, 14:00" (Ethiopian) or "27 Oct · ጥቅምት 17, 14:00" (both). The year
 * shows only when it isn't this year.
 */
export function formatDateTime(iso: string, calendar: CalendarChoice, words: DateWords, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = formatTime(date, words);
  if (isSameDay(date, now)) return `${words.today}${words.comma}${time}`;
  if (isSameDay(date, dayBefore(now))) return `${words.yesterday}${words.comma}${time}`;
  return `${formatDay(date, now, calendar, words)}${words.comma}${time}`;
}

/** The note list's short date: "09:41" today, then "Yesterday", then the date as in `formatDateTime`. */
export function formatListDate(iso: string, calendar: CalendarChoice, words: DateWords, now: Date = new Date()): string {
  const date = new Date(iso);
  if (isSameDay(date, now)) return formatTime(date, words);
  if (isSameDay(date, dayBefore(now))) return words.yesterday;
  return formatDay(date, now, calendar, words);
}

/**
 * The whole date and time, for the note's info: one line per calendar, e.g.
 * ["Fri, 30 Oct 2026, 09:41"] or ["ጥቅምት 20, 2019 ዓ.ም., 09:41"].
 */
export function formatFullDate(iso: string, calendar: CalendarChoice, words: DateWords): string[] {
  const date = new Date(iso);
  const time = formatTime(date, words);
  const gregorian = date.toLocaleDateString(words.gregorianLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // ዓ.ም. (ዓመተ ምሕረት): the Ethiopian era, so the year can't be mistaken for a Gregorian one.
  const ethiopian = `${formatEthiopianDate(toEthiopian(date), true, words.comma)} ዓ.ም.`;
  switch (calendar) {
    case "gregorian":
      return [`${gregorian}${words.comma}${time}`];
    case "ethiopian":
      return [`${ethiopian}${words.comma}${time}`];
    case "both":
      return [`${gregorian}${words.comma}${time}`, ethiopian];
  }
}

/** 24-hour time in either language: "09:41", "18:03". */
function formatTime(date: Date, words: DateWords): string {
  return date.toLocaleTimeString(words.gregorianLocale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

function formatGregorianDay(date: Date, now: Date, words: DateWords): string {
  return date.toLocaleDateString(words.gregorianLocale, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function formatEthiopianDay(date: Date, now: Date, words: DateWords): string {
  const day = toEthiopian(date);
  return formatEthiopianDate(day, day.year !== toEthiopian(now).year, words.comma);
}

function formatDay(date: Date, now: Date, calendar: CalendarChoice, words: DateWords): string {
  switch (calendar) {
    case "gregorian":
      return formatGregorianDay(date, now, words);
    case "ethiopian":
      return formatEthiopianDay(date, now, words);
    case "both":
      return `${formatGregorianDay(date, now, words)} · ${formatEthiopianDay(date, now, words)}`;
  }
}

function dayBefore(now: Date): Date {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return yesterday;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
