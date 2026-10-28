"use client";

import { useEnginePolling } from "@/features/transcriber/hooks/use-engine-polling";
import { MODEL_LABELS } from "@/features/transcriber/lib/model-labels";
import { selectedModel, useEngineStore } from "@/features/transcriber/stores/engine-store";
import type { EngineState } from "@/features/transcriber/stores/engine-store";
import { cx } from "@/utils/cx";
import type { ModelStatus } from "@shared/types/engine";

type Indicator = { label: string; tone: "checking" | "online" | "problem"; problem: string | null };

function indicator(state: EngineState, model: ModelStatus | null): Indicator {
  if (state.kind === "checking") return { label: "Checking the speech engine…", tone: "checking", problem: null };
  if (state.kind === "unreachable") return { label: "Speech engine unavailable", tone: "problem", problem: state.reason };
  if (!model) return { label: "No speech model available", tone: "problem", problem: null };
  const labels = MODEL_LABELS[model.model];
  return model.kind === "online"
    ? { label: labels.online, tone: "online", problem: null }
    : { label: labels.offline, tone: "problem", problem: model.reason };
}

const DOTS: Record<Indicator["tone"], string> = {
  checking: "bg-muted/50",
  online: "bg-brand-600",
  problem: "bg-amber-500",
};

/** Sidebar footer: whether the chosen model can transcribe right now. */
export function EngineStatus() {
  useEnginePolling();
  const state = useEngineStore((store) => store.state);
  const model = useEngineStore(selectedModel);
  const check = useEngineStore((store) => store.check);
  const { label, tone, problem } = indicator(state, model);

  return (
    <footer role="status" className="border-t border-line px-5 py-3">
      <div className="flex items-center gap-2 text-xs">
        <span className={cx("size-2 shrink-0 rounded-full", DOTS[tone])} aria-hidden />
        <span className="font-medium text-ink">{label}</span>
        {tone === "problem" ? (
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
