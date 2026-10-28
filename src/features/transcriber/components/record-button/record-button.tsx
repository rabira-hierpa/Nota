"use client";

import { Stop } from "@untitledui/icons";
import { useElapsed } from "@/features/transcriber/hooks/use-elapsed";
import type { RecorderState } from "@/features/transcriber/hooks/use-recorder";
import { formatDuration } from "@/features/transcriber/lib/format";
import { cx } from "@/utils/cx";

const IDLE_LABELS: Record<Exclude<RecorderState["kind"], "recording">, string> = {
  idle: "New recording",
  starting: "Starting microphone…",
  saving: "Saving…",
  error: "New recording",
};

interface RecordButtonProps {
  state: RecorderState;
  /** Another capture (dictation) has the microphone. */
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** Record now, transcribe after Stop. */
export function RecordButton({ state, disabled, onStart, onStop }: RecordButtonProps) {
  const elapsed = useElapsed(state.kind === "recording" ? state.startedAt : null);
  const recording = state.kind === "recording";
  const busy = state.kind === "starting" || state.kind === "saving";

  return (
    <button
      type="button"
      onClick={recording ? onStop : onStart}
      disabled={busy || disabled}
      aria-pressed={recording}
      className={cx(
        "flex h-11 w-full items-center gap-2.5 rounded-xl px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        busy && "disabled:cursor-progress",
        recording
          ? "bg-record text-white shadow-sm hover:bg-red-700"
          : "border border-line bg-white text-ink shadow-xs hover:border-ink/20 disabled:text-muted disabled:hover:border-line",
      )}
    >
      {recording ? (
        <>
          <Stop className="size-4" aria-hidden />
          <span>Stop</span>
          <span className="ml-auto flex items-center gap-2 font-mono text-xs tabular-nums">
            <span className="size-2 animate-record-pulse rounded-full bg-white" aria-hidden />
            {formatDuration(elapsed)}
          </span>
        </>
      ) : (
        <>
          <span className={cx("size-2.5 rounded-full bg-record", disabled && "opacity-40")} aria-hidden />
          <span>{IDLE_LABELS[state.kind]}</span>
        </>
      )}
    </button>
  );
}
