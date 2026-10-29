"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { InfoCircle } from "@untitledui/icons";
import { onCommand } from "@/features/notes/lib/command-bus";
import { formatDuration, formatFullDate } from "@/features/notes/lib/format";
import { noteStats } from "@/features/notes/lib/note-stats";
import { useViewStore } from "@/features/notes/stores/view-store";
import { useMessages } from "@/hooks/use-messages";
import type { Note } from "@shared/types/note";


interface NoteInfoProps {
  note: Note;
}

/**
 * The note's word count in the header, which opens its info (⌘⇧I): when it
 * was created and last changed, in the calendar chosen in Settings, and how
 * long it is.
 */
export function NoteInfo({ note }: NoteInfoProps) {
  const calendar = useViewStore((state) => state.calendar);
  const m = useMessages();
  const number = (value: number) => value.toLocaleString(m.dates.gregorianLocale);
  const stats = useMemo(() => noteStats(note.text), [note.text]);
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => onCommand("noteInfo", () => popoverRef.current?.togglePopover()), []);

  const dates = [
    { label: m.info.created, lines: formatFullDate(note.createdAt, calendar, m.dates) },
    { label: m.info.modified, lines: formatFullDate(note.updatedAt, calendar, m.dates) },
  ];
  const counts = [
    { label: m.info.paragraphs(stats.paragraphs), value: stats.paragraphs },
    { label: m.info.words(stats.words), value: stats.words },
    { label: m.info.characters(stats.characters), value: stats.characters },
  ];

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        title={m.header.infoHint}
        className="no-drag inline-flex shrink-0 cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        {m.header.words(number(stats.words), stats.words)}
        <InfoCircle className="size-3.5" aria-hidden />
        <span className="sr-only">{m.header.infoSuffix}</span>
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        aria-label={m.info.title}
        className="fixed inset-auto right-4 top-12 m-0 w-80 rounded-xl border border-line bg-surface p-4 text-ink shadow-xl"
      >
        <h2 className="text-[13px] font-semibold">{m.info.title}</h2>
        <dl className="mt-3 space-y-2.5">
          {dates.map(({ label, lines }) => (
            <div key={label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 text-xs leading-5">
              <dt className="text-muted">{label}</dt>
              <dd>
                {lines.map((line) => (
                  <span key={line} lang={/\p{Script=Ethiopic}/u.test(line) ? "am" : undefined} className="block">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          ))}
          {note.audio ? (
            <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 text-xs leading-5">
              <dt className="text-muted">{m.info.recording}</dt>
              <dd className="tabular-nums">{formatDuration(note.audio.durationMs)}</dd>
            </div>
          ) : null}
        </dl>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {counts.map(({ label, value }) => (
            // The number reads first, but a term comes before its value in the markup.
            <div key={label} className="flex flex-col-reverse rounded-lg bg-hover px-2.5 py-2">
              <dt className="text-[11px] text-muted">{label}</dt>
              <dd className="text-[17px] font-semibold tabular-nums leading-6">{number(value)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[11px] text-muted">
          {m.info.withoutSpaces(number(stats.charactersWithoutSpaces))}
        </p>
      </div>
    </>
  );
}
