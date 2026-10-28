"use client";

import { useEnginePolling } from "@/features/transcriber/hooks/use-engine-polling";
import { useEngineStore } from "@/features/transcriber/stores/engine-store";
import type { EngineState } from "@/features/transcriber/stores/engine-store";
import { cx } from "@/utils/cx";
import type { EngineName } from "@shared/types/engine";

const ENGINE_LABELS: Record<EngineName, { online: string; offline: string }> = {
  "amharic-model": { online: "Amharic model ready", offline: "Amharic model not set up" },
  voicestudio: { online: "VoiceStudio connected", offline: "VoiceStudio offline" },
};

function statusLabel(status: EngineState): string {
  switch (status.kind) {
    case "checking":
      return "Checking the speech engine…";
    case "unreachable":
      return "Speech engine unavailable";
    case "online":
    case "offline":
      return ENGINE_LABELS[status.engine][status.kind];
  }
}

const DOTS: Record<EngineState["kind"], string> = {
  checking: "bg-muted/50",
  online: "bg-brand-600",
  offline: "bg-amber-500",
  unreachable: "bg-amber-500",
};

/** Sidebar footer: which engine transcribes, and whether it can right now. */
export function EngineStatus() {
  useEnginePolling();
  const status = useEngineStore((state) => state.status);
  const check = useEngineStore((state) => state.check);
  const problem = status.kind === "offline" || status.kind === "unreachable" ? status.reason : null;

  return (
    <footer role="status" className="border-t border-line px-5 py-3">
      <div className="flex items-center gap-2 text-xs">
        <span className={cx("size-2 shrink-0 rounded-full", DOTS[status.kind])} aria-hidden />
        <span className="font-medium text-ink">{statusLabel(status)}</span>
        {problem ? (
          <button
            type="button"
            onClick={() => void check()}
            className="ml-auto rounded font-medium text-brand-700 hover:underline"
          >
            Retry
          </button>
        ) : null}
      </div>
      {problem ? <p className="mt-1 text-[11px] leading-4 text-muted">{problem}</p> : null}
    </footer>
  );
}
