"use client";

import { MESSAGES } from "@/lib/i18n";
import type { Messages } from "@/lib/i18n";
import { useLocaleStore } from "@/stores/locale-store";

/** The interface's words, in the language chosen in Settings; re-renders when it changes. */
export function useMessages(): Messages {
  return MESSAGES[useLocaleStore((state) => state.locale)];
}
