"use client";

import { useId } from "react";
import { PauseCircle, PlayCircle } from "@untitledui/icons";
import { useAudioPlayer } from "@/features/transcriber/hooks/use-audio-player";
import { formatDuration } from "@/features/transcriber/lib/format";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import type { Recording } from "@shared/types/recording";

const MS_PER_SECOND = 1000;
const SEEK_STEP_SECONDS = 0.1;

interface AudioPlayerProps {
  recording: Recording;
}

/** Bottom bar: play/pause and a seek slider for the selected recording. */
export function AudioPlayer({ recording }: AudioPlayerProps) {
  const source = useRecordingsStore((state) =>
    state.audio?.recordingId === recording.id ? state.audio.url : undefined,
  );
  const { audioRef, playing, currentTime, duration, toggle, seek } = useAudioPlayer(
    source,
    recording.durationMs / MS_PER_SECOND,
  );
  const seekId = useId();

  return (
    <footer className="flex items-center gap-4 border-t border-line bg-panel px-6 py-3">
      <audio ref={audioRef} src={source} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        disabled={!source}
        aria-label={playing ? "Pause" : "Play"}
        className="shrink-0 rounded-full text-brand-700 transition-colors hover:text-brand-600 disabled:text-muted/50"
      >
        {playing ? <PauseCircle className="size-9" aria-hidden /> : <PlayCircle className="size-9" aria-hidden />}
      </button>
      <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted">
        {formatDuration(currentTime * MS_PER_SECOND)}
      </span>
      <label htmlFor={seekId} className="sr-only">
        Playback position
      </label>
      <input
        id={seekId}
        type="range"
        min={0}
        max={duration}
        step={SEEK_STEP_SECONDS}
        value={Math.min(currentTime, duration)}
        onChange={(event) => seek(Number(event.target.value))}
        disabled={!source}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-brand-700 disabled:cursor-default"
      />
      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
        {formatDuration(duration * MS_PER_SECOND)}
      </span>
    </footer>
  );
}
