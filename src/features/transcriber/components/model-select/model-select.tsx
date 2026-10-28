"use client";

import { useId } from "react";
import { CpuChip01 } from "@untitledui/icons";
import { MODEL_LABELS } from "@/features/transcriber/lib/model-labels";
import { selectedModel, useEngineStore } from "@/features/transcriber/stores/engine-store";
import { modelIdSchema } from "@shared/schemas/engine";

interface ModelSelectProps {
  disabled: boolean;
}

/** Which speech model transcribes. Hidden when only one is on offer. */
export function ModelSelect({ disabled }: ModelSelectProps) {
  const state = useEngineStore((store) => store.state);
  const selected = useEngineStore(selectedModel);
  const choose = useEngineStore((store) => store.choose);
  const selectId = useId();

  if (state.kind !== "ready" || state.models.length < 2) return null;

  return (
    <div className="flex items-center gap-2 px-1">
      <CpuChip01 className="size-3.5 shrink-0 text-muted" aria-hidden />
      <label htmlFor={selectId} className="sr-only">
        Speech model
      </label>
      <select
        id={selectId}
        value={selected?.model ?? ""}
        onChange={(event) => {
          const model = modelIdSchema.safeParse(event.target.value);
          if (model.success) choose(model.data);
        }}
        disabled={disabled}
        className="min-w-0 flex-1 cursor-pointer truncate rounded bg-transparent py-0.5 text-xs text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.models.map((status) => (
          <option key={status.model} value={status.model}>
            {MODEL_LABELS[status.model].option}
            {status.kind === "offline" ? " (not set up)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
