"use client";

import { useEnginePolling } from "@/features/transcriber/hooks/use-engine-polling";
import { useEngineStore } from "@/features/transcriber/stores/engine-store";
import type { EngineState } from "@/features/transcriber/stores/engine-store";
import { cx } from "@/utils/cx";

const LABELS: Record<EngineState["kind"], string> = {
  checking: "Checking VoiceStudio…",
  online: "VoiceStudio connected",
  offline: "VoiceStudio offline",
};

const DOTS: Record<EngineState["kind"], string> = {
  checking: "bg-muted/50",
  online: "bg-brand-600",
  offline: "bg-amber-500",
};

/** Sidebar footer: whether the transcription engine is reachable. */
export function EngineStatus() {
  useEnginePolling();
  const status = useEngineStore((state) => state.status);
  const check = useEngineStore((state) => state.check);

  return (
    <footer role="status" className="border-t border-line px-5 py-3">
      <div className="flex items-center gap-2 text-xs">
        <span className={cx("size-2 shrink-0 rounded-full", DOTS[status.kind])} aria-hidden />
        <span className="font-medium text-ink">{LABELS[status.kind]}</span>
        {status.kind === "offline" ? (
          <button
            type="button"
            onClick={() => void check()}
            className="ml-auto rounded font-medium text-brand-700 hover:underline"
          >
            Retry
          </button>
        ) : null}
      </div>
      {status.kind === "offline" ? <p className="mt-1 text-[11px] leading-4 text-muted">{status.reason}</p> : null}
    </footer>
  );
}
