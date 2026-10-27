"use client";

import { useIsTranscribing } from "@/features/transcriber/hooks/use-selected-recording";
import { formatDuration, formatRecordedAt } from "@/features/transcriber/lib/format";
import { transcriptPreview } from "@/features/transcriber/lib/recording-display";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import { cx } from "@/utils/cx";
import type { Recording } from "@shared/types/recording";

interface RecordingListItemProps {
  recording: Recording;
}

export function RecordingListItem({ recording }: RecordingListItemProps) {
  const select = useRecordingsStore((state) => state.select);
  const selected = useRecordingsStore((state) => state.selectedId === recording.id);
  const transcribing = useIsTranscribing(recording.id);
  const preview = transcriptPreview(recording, transcribing);
  const failed = !transcribing && recording.transcription.status === "error" && !preview.isTranscript;

  return (
    <li>
      <button
        type="button"
        onClick={() => void select(recording.id)}
        aria-current={selected ? "true" : undefined}
        className={cx(
          "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
          selected ? "bg-white shadow-xs ring-1 ring-line" : "hover:bg-ink/[0.04]",
        )}
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{formatRecordedAt(recording.createdAt)}</span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
            {formatDuration(recording.durationMs)}
          </span>
        </span>
        <span
          lang={preview.isTranscript ? "am" : undefined}
          className={cx(
            "mt-0.5 line-clamp-2 text-[13px] leading-5",
            preview.isTranscript ? "font-ethiopic text-ink/75" : "text-muted",
            transcribing && "animate-pulse",
            failed && "text-red-700",
          )}
        >
          {preview.text}
        </span>
      </button>
    </li>
  );
}
