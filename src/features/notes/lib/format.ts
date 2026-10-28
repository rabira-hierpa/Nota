const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/** 754000 → "12:34"; 3_723_000 → "1:02:03". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MS_PER_SECOND));
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = String(total % SECONDS_PER_MINUTE).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** "Today, 09:41", "Yesterday, 18:03", "27 Oct, 14:00", "3 Mar 2025, 08:15". */
export function formatDateTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = formatTime(date);
  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, dayBefore(now))) return `Yesterday, ${time}`;
  return `${formatDay(date, now)}, ${time}`;
}

/** The note list's short date: "09:41" today, then "Yesterday", "27 Oct", "3 Mar 2025". */
export function formatListDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (isSameDay(date, now)) return formatTime(date);
  if (isSameDay(date, dayBefore(now))) return "Yesterday";
  return formatDay(date, now);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(date: Date, now: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function dayBefore(now: Date): Date {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return yesterday;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
