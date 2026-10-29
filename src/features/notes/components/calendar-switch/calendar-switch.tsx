"use client";

import { useMessages } from "@/hooks/use-messages";
import type { CalendarChoice } from "@/features/notes/lib/format";
import { formatFullDate } from "@/features/notes/lib/format";
import { useViewStore } from "@/features/notes/stores/view-store";
import { cx } from "@/utils/cx";

const OPTIONS: readonly CalendarChoice[] = ["gregorian", "ethiopian", "both"];

/** Which calendar the note list, the note and its info show dates in, with today's date as an example. */
export function CalendarSwitch() {
  const calendar = useViewStore((state) => state.calendar);
  const setCalendar = useViewStore((state) => state.setCalendar);
  const m = useMessages();
  // The example drops the time: it only shows how a date will read.
  const today = formatFullDate(new Date().toISOString(), calendar, m.dates).map((line) => line.replace(/(, |፣ )\d\d:\d\d$/u, ""));

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-muted">{m.settings.dates}</legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-hover p-1">
        {OPTIONS.map((value) => (
          <label
            key={value}
            className={cx(
              "flex h-8 cursor-pointer items-center justify-center rounded-md text-xs font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              calendar === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <input
              type="radio"
              name="calendar"
              value={value}
              checked={calendar === value}
              onChange={() => setCalendar(value)}
              className="sr-only"
            />
            {m.settings[value]}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted">
        {/* The page is built ahead of time; today's date is only right once it runs. */}
        {m.settings.today}{" "}
        <span lang={calendar === "gregorian" ? undefined : "am"} suppressHydrationWarning>
          {today.join(" · ")}
        </span>
      </p>
    </fieldset>
  );
}
