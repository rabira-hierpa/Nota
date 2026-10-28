import { create } from "zustand";
import { invokeDesktop } from "@/lib/desktop";
import { readPreference, savePreference } from "@/lib/preferences";
import { modelIdSchema } from "@shared/schemas/engine";
import type { ModelId, ModelStatus } from "@shared/types/engine";

const STORAGE_KEY = "amharic-stt:model";

/** The models the main process offers, or why it couldn't be asked. */
export type EngineState =
  | { kind: "checking" }
  | { kind: "ready"; models: ModelStatus[] }
  | { kind: "unreachable"; reason: string };

interface EngineStore {
  state: EngineState;
  /** The user's pick, remembered across launches. It may name a model that isn't offered. */
  chosen: ModelId | null;
  check: () => Promise<void>;
  choose: (model: ModelId) => void;
  /** Starts loading the chosen model while the user speaks. */
  prepare: () => void;
}

function readSavedModel(): ModelId | null {
  const parsed = modelIdSchema.safeParse(readPreference(STORAGE_KEY));
  return parsed.success ? parsed.data : null;
}

/** The model to transcribe with: the user's pick if it is offered, else the first on offer. */
export function selectedModel({ state, chosen }: Pick<EngineStore, "state" | "chosen">): ModelStatus | null {
  if (state.kind !== "ready") return null;
  return state.models.find((status) => status.model === chosen) ?? state.models[0] ?? null;
}

export const useEngineStore = create<EngineStore>()((set, get) => ({
  state: { kind: "checking" },
  chosen: null,

  check: async () => {
    const result = await invokeDesktop((api) => api.listModels());
    set({
      state: result.success ? { kind: "ready", models: result.data } : { kind: "unreachable", reason: result.error },
      chosen: get().chosen ?? readSavedModel(),
    });
  },

  choose: (model) => {
    savePreference(STORAGE_KEY, model);
    set({ chosen: model });
  },

  prepare: () => {
    const model = selectedModel(get());
    if (model?.kind === "online") void invokeDesktop((api) => api.prepareModel(model.model));
  },
}));
