import { cx } from "@/utils/cx";
import type { Transcription } from "@shared/types/note";

type BadgeKind = Transcription["status"] | "transcribing";

const BADGES: Record<BadgeKind, { label: string; className: string }> = {
  transcribing: { label: "Transcribing…", className: "animate-pulse bg-accent-soft text-accent-ink" },
  pending: { label: "Not transcribed", className: "bg-hover text-muted" },
  done: { label: "Transcribed", className: "bg-hover text-ink/80" },
  error: { label: "Failed", className: "bg-warn-soft text-warn-ink" },
};

interface TranscriptionBadgeProps {
  status: Transcription["status"];
  transcribing: boolean;
}

export function TranscriptionBadge({ status, transcribing }: TranscriptionBadgeProps) {
  const badge = BADGES[transcribing ? "transcribing" : status];
  return (
    <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", badge.className)}>
      {badge.label}
    </span>
  );
}
