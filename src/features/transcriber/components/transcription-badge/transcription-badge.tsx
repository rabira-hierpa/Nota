import { cx } from "@/utils/cx";
import type { Transcription } from "@shared/types/recording";

type BadgeKind = Transcription["status"] | "transcribing";

const BADGES: Record<BadgeKind, { label: string; className: string }> = {
  transcribing: { label: "Transcribing…", className: "animate-pulse bg-brand-50 text-brand-700" },
  pending: { label: "Not transcribed", className: "bg-ink/5 text-muted" },
  done: { label: "Transcribed", className: "bg-brand-50 text-brand-700" },
  error: { label: "Failed", className: "bg-red-50 text-red-700" },
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
