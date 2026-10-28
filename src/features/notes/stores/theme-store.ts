import { create } from "zustand";
import { readPreference, savePreference } from "@/lib/preferences";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "nota:theme";
const THEMES: readonly ThemePreference[] = ["system", "light", "dark"];

interface ThemeStore {
  preference: ThemePreference;
  /** Reads the saved choice; call once on the client. */
  restore: () => void;
  choose: (preference: ThemePreference) => void;
}

function isTheme(value: string | null): value is ThemePreference {
  return THEMES.some((theme) => theme === value);
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  preference: "system",

  restore: () => {
    const saved = readPreference(STORAGE_KEY);
    if (isTheme(saved)) set({ preference: saved });
  },

  choose: (preference) => {
    savePreference(STORAGE_KEY, preference);
    set({ preference });
  },
}));
