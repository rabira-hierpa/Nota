"use client";

import { Microphone02, Stop } from "@untitledui/icons";
import { useElapsed } from "@/features/notes/hooks/use-elapsed";
import type { RecorderState } from "@/features/notes/hooks/use-recorder";
import { formatDuration } from "@/features/notes/lib/format";
import { cx } from "@/utils/cx";

const BUSY_LABELS: Partial<Record<RecorderState["kind"], string>> = {
  starting: "Starting microphone…",
  saving: "Saving…",
};

interface RecordButtonProps {
  state: RecorderState;
  /** Dictation has the microphone. */
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** Record a voice note: transcribed into a new note after Stop. */
export function RecordButton({ state, disabled, onStart, onStop }: RecordButtonProps) {
  const elapsed = useElapsed(state.kind === "recording" ? state.startedAt : null);
  const busyLabel = BUSY_LABELS[state.kind];

  if (state.kind === "recording") {
    return (
      <button
        type="button"
        onClick={onStop}
        aria-label="Stop recording"
        className="no-drag inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-record px-3 text-xs font-semibold text-white shadow-sm transition-colors duration-150 hover:opacity-90"
      >
        <span className="size-1.5 animate-record-pulse rounded-full bg-white" aria-hidden />
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
      aria-label={busyLabel ?? "Record a voice note"}
      title="Record a voice note"
      className={cx(
        "no-drag inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-hover hover:text-record",
        "disabled:cursor-not-allowed disabled:opacity-40",
        busyLabel && "animate-pulse disabled:cursor-progress",
      )}
    >
      <Microphone02 className="size-4" />
    </button>
  );
}
