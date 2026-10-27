import { create } from "zustand";
import { invokeDesktop } from "@/lib/desktop";
import type { EngineStatus } from "@shared/types/engine";

export type EngineState = { kind: "checking" } | EngineStatus;

interface EngineStore {
  status: EngineState;
  check: () => Promise<void>;
}

export const useEngineStore = create<EngineStore>()((set) => ({
  status: { kind: "checking" },
  check: async () => {
    const result = await invokeDesktop((api) => api.engineStatus());
    set({ status: result.success ? result.data : { kind: "offline", url: "", reason: result.error } });
  },
}));
