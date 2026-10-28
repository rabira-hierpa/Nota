"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/features/notes/stores/theme-store";

/**
 * Applies the chosen theme to <html>. "system" removes the attribute and
 * lets the stylesheet follow the operating system.
 */
export function useTheme(): void {
  const preference = useThemeStore((state) => state.preference);
  const restore = useThemeStore((state) => state.restore);

  useEffect(() => restore(), [restore]);

  useEffect(() => {
    const root = document.documentElement;
    if (preference === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", preference);
  }, [preference]);
}
