"use client";

import { Lock01, Microphone02, Pin02, Star01 } from "@untitledui/icons";
import { HighlightedText } from "@/features/notes/components/highlighted-text";
import { formatListDate } from "@/features/notes/lib/format";
import { notePreview, noteTitle } from "@/features/notes/lib/note-text";
import { isSealed, useNotesStore } from "@/features/notes/stores/notes-store";
import { useViewStore } from "@/features/notes/stores/view-store";
import { useMessages } from "@/hooks/use-messages";
import type { Messages } from "@/lib/i18n";
import { cx } from "@/utils/cx";
import type { Note } from "@shared/types/note";

interface NoteListItemProps {
  note: Note;
  /** Search words to highlight. */
  terms: readonly string[];
}

function placeholderTitle(note: Note, transcribing: boolean, words: Messages["item"]): string {
  if (transcribing) return words.transcribing;
  return note.audio ? words.voiceNote : words.newNote;
}

/** A note in the list: its first line as the title, the next lines as a preview. */
export function NoteListItem({ note, terms }: NoteListItemProps) {
  const select = useNotesStore((state) => state.select);
  const selected = useNotesStore((state) => state.selectedId === note.id);
  const transcribing = useNotesStore((state) => state.transcribingIds.includes(note.id));
  const title = noteTitle(note.text);
  // A locked note never shows its text in the list, even while it is open.
  const preview = note.lock ? "" : notePreview(note.text);
  const sealed = useNotesStore((state) => isSealed(note, state.openedIds));
  const calendar = useViewStore((state) => state.calendar);
  const m = useMessages();

  return (
    <li className="border-b border-line/70 last:border-b-0">
      <button
        type="button"
        onClick={() => void select(note.id)}
        aria-current={selected ? "true" : undefined}
        className={cx(
          "relative block w-full cursor-pointer px-4 py-3 text-left transition-colors duration-150",
          selected ? "bg-selected" : "hover:bg-hover",
        )}
      >
        {selected ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-accent" aria-hidden /> : null}
        <span className="flex items-baseline gap-2">
          <span
            lang={title ? "am" : undefined}
            className={cx(
              "min-w-0 flex-1 truncate text-[14px] font-semibold leading-6",
              title ? "font-ethiopic text-ink" : "italic text-muted",
              transcribing && "animate-pulse",
            )}
          >
            {title ? <HighlightedText text={title} terms={terms} /> : placeholderTitle(note, transcribing, m.item)}
          </span>
          {note.pinned ? (
            <>
              <Pin02 className="size-3.5 shrink-0 text-accent" aria-hidden />
              <span className="sr-only">{m.item.pinned}</span>
            </>
          ) : null}
          {note.favorite ? (
            <>
              <Star01 className="size-3.5 shrink-0 text-accent" fill="currentColor" aria-hidden />
              <span className="sr-only">{m.item.favorite}</span>
            </>
          ) : null}
        </span>
        {preview ? (
          <span lang="am" className="mt-0.5 line-clamp-2 font-ethiopic text-[13px] leading-5 text-muted">
            <HighlightedText text={preview} terms={terms} />
          </span>
        ) : null}
        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
          <time dateTime={note.updatedAt}>{formatListDate(note.updatedAt, calendar, m.dates)}</time>
          {note.lock ? (
            <span className="inline-flex items-center gap-1">
              <Lock01 className="size-3" aria-hidden />
              {sealed ? m.item.locked : m.item.unlocked}
            </span>
          ) : null}
          {note.audio ? (
            <>
              <Microphone02 className="size-3" aria-hidden />
              <span className="sr-only">{m.item.hasRecording}</span>
            </>
          ) : null}
        </span>
      </button>
    </li>
  );
}
