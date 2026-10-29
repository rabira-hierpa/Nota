import { create } from "zustand";
import { invokeDesktop } from "@/lib/desktop";
import { readPreference, savePreference } from "@/lib/preferences";
import { localeSchema } from "@shared/schemas/locale";
import type { Locale } from "@shared/types/locale";

const LOCALE_KEY = "nota:locale";

interface LocaleStore {
  /** The interface's language. Notes are in whatever language they're written in. */
  locale: Locale;
  /** Reads the saved language; call once on the client. */
  restore: () => void;
  setLocale: (locale: Locale) => void;
}

/** The menu bar is drawn by main: tell it which language to use. A failure leaves the menu in English, nothing worse. */
function tellMain(locale: Locale): void {
  void invokeDesktop((api) => api.setLocale({ locale }));
}

export const useLocaleStore = create<LocaleStore>()((set) => ({
  locale: "en",

  restore: () => {
    const saved = localeSchema.safeParse(readPreference(LOCALE_KEY));
    if (!saved.success) return;
    set({ locale: saved.data });
    tellMain(saved.data);
  },

  setLocale: (locale) => {
    savePreference(LOCALE_KEY, locale);
    set({ locale });
    tellMain(locale);
  },
}));
