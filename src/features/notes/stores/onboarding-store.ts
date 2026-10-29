import { create } from "zustand";
import { useEngineStore } from "@/features/notes/stores/engine-store";
import { currentMessages } from "@/lib/i18n";
import { invokeDesktop, subscribeToSetup } from "@/lib/desktop";
import type { LocalModelId } from "@shared/types/engine";

/** How a model setup run by the guide is going. */
export type SetupState =
  | { kind: "idle" }
  | { kind: "running"; model: LocalModelId }
  | { kind: "done"; model: LocalModelId }
  | { kind: "failed"; model: LocalModelId; message: string };

interface OnboardingStore {
  open: boolean;
  step: number;
  setup: SetupState;
  /** The setup's latest output, newest last (a short tail, not the whole log). */
  lines: string[];
  /** Asks the main process whether this is a fresh install; opens the guide if so. */
  load: () => Promise<void>;
  show: () => void;
  goTo: (step: number) => void;
  /** Closes the guide and remembers it was seen. */
  finish: () => Promise<void>;
  startSetup: (model: LocalModelId) => Promise<void>;
  cancelSetup: () => Promise<void>;
}

const MAX_LINES = 200;

let unsubscribe: (() => void) | null = null;

export const useOnboardingStore = create<OnboardingStore>()((set, get) => ({
  open: false,
  step: 0,
  setup: { kind: "idle" },
  lines: [],

  load: async () => {
    const result = await invokeDesktop((api) => api.getOnboarding());
    if (result.success && result.data.show) set({ open: true, step: 0 });
  },

  show: () => set({ open: true, step: 0 }),
  goTo: (step) => set({ step }),

  finish: async () => {
    set({ open: false });
    await invokeDesktop((api) => api.completeOnboarding());
  },

  startSetup: async (model) => {
    if (get().setup.kind === "running") return;
    unsubscribe?.();
    set({ setup: { kind: "running", model }, lines: [] });
    unsubscribe = subscribeToSetup((event) => {
      if (event.kind === "line") {
        set((state) => ({ lines: [...state.lines, event.text].slice(-MAX_LINES) }));
        return;
      }
      unsubscribe?.();
      unsubscribe = null;
      set({ setup: event.ok ? { kind: "done", model } : { kind: "failed", model, message: currentMessages().errors.setupFailed } });
      // The model shows as ready as soon as the main process sees its files.
      void useEngineStore.getState().check();
    });
    const result = await invokeDesktop((api) => api.startModelSetup(model));
    if (!result.success) {
      unsubscribe?.();
      unsubscribe = null;
      set({ setup: { kind: "failed", model, message: result.error } });
    }
  },

  cancelSetup: async () => {
    await invokeDesktop((api) => api.cancelModelSetup());
  },
}));
