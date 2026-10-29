"use client";

import { useMessages } from "@/hooks/use-messages";
import { cx } from "@/utils/cx";
import type { Transcription } from "@shared/types/note";

type BadgeKind = Transcription["status"] | "transcribing";

const BADGES: Record<BadgeKind, string> = {
  transcribing: "animate-pulse bg-accent-soft text-accent-ink",
  pending: "bg-hover text-muted",
  done: "bg-hover text-ink/80",
  error: "bg-warn-soft text-warn-ink",
};

interface TranscriptionBadgeProps {
  status: Transcription["status"];
  transcribing: boolean;
}

export function TranscriptionBadge({ status, transcribing }: TranscriptionBadgeProps) {
  const kind: BadgeKind = transcribing ? "transcribing" : status;
  const m = useMessages();
  return (
    <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", BADGES[kind])}>
      {m.audio.badges[kind]}
    </span>
  );
}
