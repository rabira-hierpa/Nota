import { am } from "@/lib/i18n/am";
import { en } from "@/lib/i18n/en";
import type { Messages } from "@/lib/i18n/en";
import { useLocaleStore } from "@/stores/locale-store";
import type { Locale } from "@shared/types/locale";

export type { Messages };

export const MESSAGES: Record<Locale, Messages> = { en, am };

/**
 * The interface's words in the language chosen now, for code outside React
 * (a store building an error message). Components use `useMessages`.
 */
export function currentMessages(): Messages {
  return MESSAGES[useLocaleStore.getState().locale];
}
