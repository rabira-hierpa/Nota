"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/stores/locale-store";

/**
 * Restores the saved language once and keeps `<html lang>` in step with it,
 * so screen readers read the interface in the right voice.
 */
export function useLocale(): void {
  const locale = useLocaleStore((state) => state.locale);
  const restore = useLocaleStore((state) => state.restore);

  useEffect(() => restore(), [restore]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}
