"use client";

import { useEffect, useState } from "react";
import { Check, Copy01, RefreshCw01, Trash01 } from "@untitledui/icons";
import { TranscriptionBadge } from "@/features/transcriber/components/transcription-badge";
import { formatDuration, formatRecordedAt } from "@/features/transcriber/lib/format";
import { MODEL_LABELS } from "@/features/transcriber/lib/model-labels";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import { cx } from "@/utils/cx";
import type { Recording } from "@shared/types/recording";

const COPIED_FEEDBACK_MS = 1500;
const ACTION_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.05] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

interface TranscriptHeaderProps {
  recording: Recording;
  transcribing: boolean;
}

export function TranscriptHeader({ recording, transcribing }: TranscriptHeaderProps) {
  const transcribe = useRecordingsStore((state) => state.transcribe);
  const remove = useRecordingsStore((state) => state.remove);
  const [copied, setCopied] = useState(false);
  const hasText = recording.transcript.trim().length > 0;
  const model = recording.transcription.status === "done" ? recording.transcription.model : undefined;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard
      .writeText(recording.transcript)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  const retranscribe = () => {
    if (hasText && !window.confirm("Replace the current text with a new transcription?")) return;
    void transcribe(recording.id);
  };

  const deleteRecording = () => {
    if (window.confirm("Delete this recording and its text? This can't be undone.")) {
      void remove(recording.id);
    }
  };

  return (
    <header className="flex items-center gap-2 border-b border-line px-8 py-4">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold">{formatRecordedAt(recording.createdAt)}</h2>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span className="font-mono tabular-nums">{formatDuration(recording.durationMs)}</span>
          <span aria-hidden>·</span>
          <TranscriptionBadge status={recording.transcription.status} transcribing={transcribing} />
          {model && !transcribing ? <span>by {MODEL_LABELS[model].name}</span> : null}
        </div>
      </div>
      <button type="button" onClick={copy} disabled={!hasText} className={ACTION_CLASS}>
        {copied ? <Check className="size-4" aria-hidden /> : <Copy01 className="size-4" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button type="button" onClick={retranscribe} disabled={transcribing} className={ACTION_CLASS}>
        <RefreshCw01 className={cx("size-4", transcribing && "animate-spin")} aria-hidden />
        {recording.transcription.status === "pending" ? "Transcribe" : "Transcribe again"}
      </button>
      <button
        type="button"
        onClick={deleteRecording}
        disabled={transcribing}
        aria-label="Delete recording"
        className={cx(ACTION_CLASS, "text-muted hover:text-red-700")}
      >
        <Trash01 className="size-4" aria-hidden />
      </button>
    </header>
  );
}
