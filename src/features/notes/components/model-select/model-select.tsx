"use client";

import { useId } from "react";
import { MODEL_NAMES } from "@/features/notes/lib/model-labels";
import { selectedModel, useEngineStore } from "@/features/notes/stores/engine-store";
import { useMessages } from "@/hooks/use-messages";
import type { Messages } from "@/lib/i18n";
import { modelIdSchema } from "@shared/schemas/engine";
import type { ModelStatus } from "@shared/types/engine";

interface ModelSelectProps {
  disabled: boolean;
  /** Compact: no visible label, for the recording bar. */
  compact?: boolean;
}

/** Why a model can't be used now: not set up, or (built in) couldn't start. */
function offlineNote(status: ModelStatus, m: Messages): string {
  if (status.kind === "online") return "";
  return status.builtIn ? m.models.cantStart : m.models.notSetUp;
}

/** Which speech model transcribes. Hidden when only one is on offer. */
export function ModelSelect({ disabled, compact = false }: ModelSelectProps) {
  const state = useEngineStore((store) => store.state);
  const selected = useEngineStore(selectedModel);
  const choose = useEngineStore((store) => store.choose);
  const selectId = useId();
  const m = useMessages();

  if (state.kind !== "ready" || state.models.length < 2) return null;

  return (
    <div className={compact ? "min-w-0" : undefined}>
      <label
        htmlFor={selectId}
        className={compact ? "sr-only" : "mb-1.5 block text-xs font-medium text-muted"}
      >
        {m.models.label}
      </label>
      <select
        id={selectId}
        value={selected?.model ?? ""}
        onChange={(event) => {
          const model = modelIdSchema.safeParse(event.target.value);
          if (model.success) choose(model.data);
        }}
        disabled={disabled}
        className={
          compact
            ? "h-8 max-w-44 cursor-pointer truncate rounded-md bg-transparent px-1.5 text-xs text-muted hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            : "h-9 w-full cursor-pointer truncate rounded-lg border border-line bg-paper px-2.5 text-[13px] text-ink disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {state.models.map((status) => (
          <option key={status.model} value={status.model}>
            {compact ? MODEL_NAMES[status.model] : m.models[status.model].option}
            {offlineNote(status, m)}
          </option>
        ))}
      </select>
    </div>
  );
}
