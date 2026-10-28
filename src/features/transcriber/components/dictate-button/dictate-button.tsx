"use client";

import { Recording02, Stop } from "@untitledui/icons";
import { useElapsed } from "@/features/transcriber/hooks/use-elapsed";
import { formatDuration } from "@/features/transcriber/lib/format";
import type { DictationState } from "@/features/transcriber/stores/dictation-store";
import { cx } from "@/utils/cx";

const IDLE_LABELS: Record<Exclude<DictationState["kind"], "listening">, string> = {
  idle: "Dictate",
  starting: "Starting microphone…",
  finishing: "Finishing…",
  error: "Dictate",
};

interface DictateButtonProps {
  state: DictationState;
  /** Another capture (a recording) has the microphone. */
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** Live dictation: the text appears after each pause, while still speaking. */
export function DictateButton({ state, disabled, onStart, onStop }: DictateButtonProps) {
  const elapsed = useElapsed(state.kind === "listening" ? state.startedAt : null);
  const listening = state.kind === "listening";
  const busy = state.kind === "starting" || state.kind === "finishing";

  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      disabled={busy || disabled}
      aria-pressed={listening}
      className={cx(
        "flex h-11 w-full items-center gap-2.5 rounded-xl px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        busy && "disabled:cursor-progress",
        listening
          ? "bg-brand-700 text-white shadow-sm hover:bg-brand-600"
          : "border border-line bg-white text-ink shadow-xs hover:border-ink/20 disabled:text-muted disabled:hover:border-line",
      )}
    >
      {listening ? (
        <>
          <Stop className="size-4" aria-hidden />
          <span>Stop dictating</span>
          <span className="ml-auto flex items-center gap-2 font-mono text-xs tabular-nums">
            <span className="size-2 animate-record-pulse rounded-full bg-white" aria-hidden />
            {formatDuration(elapsed)}
          </span>
        </>
      ) : (
        <>
          <Recording02 className={cx("size-4 text-brand-700", disabled && "opacity-40")} aria-hidden />
          <span>{IDLE_LABELS[state.kind]}</span>
          <span className="ml-auto text-[11px] font-normal text-muted">live text</span>
        </>
      )}
    </button>
  );
}
