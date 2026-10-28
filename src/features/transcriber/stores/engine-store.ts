import { create } from "zustand";
import { invokeDesktop } from "@/lib/desktop";
import type { EngineStatus } from "@shared/types/engine";

/** The engine's own status, or why the main process couldn't be asked. */
export type EngineState = { kind: "checking" } | EngineStatus | { kind: "unreachable"; reason: string };

interface EngineStore {
  status: EngineState;
  check: () => Promise<void>;
}

export const useEngineStore = create<EngineStore>()((set) => ({
  status: { kind: "checking" },
  check: async () => {
    const result = await invokeDesktop((api) => api.engineStatus());
    set({ status: result.success ? result.data : { kind: "unreachable", reason: result.error } });
  },
}));
