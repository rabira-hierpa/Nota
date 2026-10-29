"use client";

import { useEffect } from "react";
import { isMacPlatform } from "@/features/notes/lib/accelerators";
import { useViewStore } from "@/features/notes/stores/view-store";

/**
 * Folds the sidebar away (`html[data-sidebar="hidden"]` in globals.css) and
 * marks a Mac (`data-platform`), whose traffic lights sit over the window's
 * top-left corner: whichever header ends up there makes room for them.
 */
export function useSidebar(): void {
  const hidden = useViewStore((state) => state.sidebarHidden);

  useEffect(() => {
    if (isMacPlatform()) document.documentElement.setAttribute("data-platform", "mac");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (hidden) root.setAttribute("data-sidebar", "hidden");
    else root.removeAttribute("data-sidebar");
  }, [hidden]);
}
