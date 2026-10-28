"use client";

import { Stop } from "@untitledui/icons";
import { MicrophoneSelect } from "@/features/transcriber/components/microphone-select";
import { useElapsed } from "@/features/transcriber/hooks/use-elapsed";
import { useSelectedMicrophone } from "@/features/transcriber/hooks/use-microphones";
import { useRecorder } from "@/features/transcriber/hooks/use-recorder";
import type { RecorderState } from "@/features/transcriber/hooks/use-recorder";
import { formatDuration } from "@/features/transcriber/lib/format";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import { cx } from "@/utils/cx";

const IDLE_LABELS: Record<Exclude<RecorderState["kind"], "recording">, string> = {
  idle: "New recording",
  starting: "Starting microphone…",
  saving: "Saving…",
  error: "New recording",
};

export function RecordButton() {
  const add = useRecordingsStore((state) => state.add);
  const microphone = useSelectedMicrophone();
  const { state, start, stop } = useRecorder(microphone, add);
  const elapsed = useElapsed(state.kind === "recording" ? state.startedAt : null);
  const recording = state.kind === "recording";
  const busy = state.kind === "starting" || state.kind === "saving";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={recording ? stop : () => void start()}
        disabled={busy}
        aria-pressed={recording}
        className={cx(
          "flex h-11 w-full items-center gap-2.5 rounded-xl px-4 text-sm font-medium transition-colors disabled:cursor-progress",
          recording
            ? "bg-record text-white shadow-sm hover:bg-red-700"
            : "border border-line bg-white text-ink shadow-xs hover:border-ink/20 disabled:text-muted",
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
            <span className="size-2.5 rounded-full bg-record" aria-hidden />
            <span>{IDLE_LABELS[state.kind]}</span>
          </>
        )}
      </button>
      <MicrophoneSelect disabled={recording || busy} />
      {state.kind === "error" ? (
        <p role="alert" className="px-1 text-xs leading-5 text-red-700">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
