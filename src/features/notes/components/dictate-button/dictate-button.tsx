"use client";

import { Recording02, Stop } from "@untitledui/icons";
import { useElapsed } from "@/features/notes/hooks/use-elapsed";
import { formatDuration } from "@/features/notes/lib/format";
import type { DictationState } from "@/features/notes/stores/dictation-store";
import { cx } from "@/utils/cx";

const BUSY_LABELS: Partial<Record<DictationState["kind"], string>> = {
  starting: "Starting…",
  finishing: "Finishing…",
};

interface DictateButtonProps {
  state: DictationState;
  /** A recording has the microphone, or the note can't be edited. */
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** Live dictation into the open note: the words appear at the cursor after each pause. */
export function DictateButton({ state, disabled, onStart, onStop }: DictateButtonProps) {
  const elapsed = useElapsed(state.kind === "listening" ? state.startedAt : null);
  const busyLabel = BUSY_LABELS[state.kind];

  if (state.kind === "listening") {
    return (
      <button
        type="button"
        onClick={onStop}
        aria-pressed
        className="no-drag inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-accent px-3 text-xs font-semibold text-on-accent shadow-sm transition-opacity duration-150 hover:opacity-90"
      >
        <span className="size-1.5 animate-record-pulse rounded-full bg-on-accent" aria-hidden />
        <span>Stop dictating</span>
        <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
        <Stop className="size-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled || busyLabel !== undefined}
      aria-pressed={false}
      title="Dictate: speak, and the text appears after each pause"
      className={cx(
        "no-drag inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink shadow-xs transition-colors duration-150 hover:border-accent hover:text-accent-ink",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink",
        busyLabel && "disabled:cursor-progress",
      )}
    >
      <Recording02 className="size-3.5 text-accent" aria-hidden />
      {busyLabel ?? "Dictate"}
    </button>
  );
}
