"use client";

import { useId, useMemo, useState } from "react";
import { AlignLeft, Plus, Stars02 } from "@untitledui/icons";
import type { Editor } from "@tiptap/react";
import { useTaggedTexts } from "@/features/notes/hooks/use-library";
import { addTags, countSplittable, insertSummary, splitLongParagraphs } from "@/features/notes/lib/apply-assist";
import { suggestTags } from "@/features/notes/lib/suggest-tags";
import { summarize } from "@/features/notes/lib/summarize";
import { useMessages } from "@/hooks/use-messages";
import type { Note } from "@shared/types/note";

const ACTION_CLASS =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-paper px-3 text-xs font-semibold text-ink transition-colors duration-150 hover:border-accent disabled:cursor-not-allowed disabled:opacity-50";

interface NoteAssistProps {
  note: Note;
  editor: Editor | null;
  disabled: boolean;
}

/**
 * Summarize & organize, on this computer: the note's key sentences (added
 * as a quote under its title), long transcripts cut into paragraphs where the
 * topic changes, and tags that would file it with notes like it. Plain text
 * measures, no model: instant, offline, and the words stay the note's own.
 */
export function NoteAssist({ note, editor, disabled }: NoteAssistProps) {
  const popoverId = useId();
  const library = useTaggedTexts();
  // Worked out only while the panel is open, not on every keystroke.
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const m = useMessages();
  const summary = useMemo(() => (open ? summarize(note.text) : []), [open, note.text]);
  const tags = useMemo(
    () => (open ? suggestTags(note, library).filter(({ tag }) => !added.includes(tag)) : []),
    [open, note, library, added],
  );
  const splittable = open && editor ? countSplittable(editor) : 0;

  const addTag = (tag: string) => {
    if (!editor) return;
    addTags(editor, [tag]);
    setAdded((current) => [...current, tag]);
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        disabled={disabled || !editor}
        aria-label={m.assist.button}
        title={m.assist.button}
        className="no-drag inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Stars02 className="size-4" />
      </button>
      <div
        id={popoverId}
        popover="auto"
        aria-label={m.assist.button}
        onToggle={(event) => {
          setOpen(event.newState === "open");
          setAdded([]);
        }}
        className="fixed inset-auto right-4 top-12 m-0 max-h-[calc(100vh-4rem)] w-96 space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-4 text-ink shadow-xl"
      >
        <header>
          <h2 className="text-[13px] font-semibold">{m.assist.title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted">{m.assist.subtitle}</p>
        </header>

        <section aria-label={m.assist.summary}>
          <h3 className="mb-1.5 text-xs font-medium text-muted">{m.assist.keySentences}</h3>
          {summary.length > 0 ? (
            <>
              <ul className="space-y-1.5 border-l-2 border-accent pl-3">
                {summary.map((sentence) => (
                  <li key={sentence} lang="am" className="font-ethiopic text-[13px] leading-6">
                    {sentence}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => editor && insertSummary(editor, summary)}
                className={`${ACTION_CLASS} mt-2.5`}
              >
                <Plus className="size-3.5" aria-hidden />
                {m.assist.addSummary}
              </button>
            </>
          ) : (
            <p className="text-xs leading-5 text-muted">{m.assist.tooShort}</p>
          )}
        </section>

        <section aria-label={m.assist.paragraphs}>
          <h3 className="mb-1.5 text-xs font-medium text-muted">{m.assist.paragraphs}</h3>
          {splittable > 0 ? (
            <>
              <p className="text-xs leading-5 text-muted">{m.assist.canSplit(splittable)}</p>
              <button
                type="button"
                onClick={() => editor && splitLongParagraphs(editor)}
                className={`${ACTION_CLASS} mt-2`}
              >
                <AlignLeft className="size-3.5" aria-hidden />
                {m.assist.split}
              </button>
            </>
          ) : (
            <p className="text-xs leading-5 text-muted">{m.assist.noSplit}</p>
          )}
        </section>

        <section aria-label={m.assist.tags}>
          <h3 className="mb-1.5 text-xs font-medium text-muted">{m.assist.tags}</h3>
          {tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {tags.map(({ tag, source }) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => addTag(tag)}
                    title={source === "library" ? m.assist.fromLibrary : m.assist.fromKeyword}
                    className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-accent-soft px-2 font-ethiopic text-xs font-semibold text-accent-ink transition-opacity duration-150 hover:opacity-80"
                  >
                    <Plus className="size-3" aria-hidden />
                    <span lang="am">#{tag}</span>
                    {source === "library" ? null : <span className="sr-only">{m.assist.newTag}</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs leading-5 text-muted">{m.assist.noTags}</p>
          )}
        </section>
      </div>
    </>
  );
}
