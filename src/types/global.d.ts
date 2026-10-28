import type { DesktopApi, DesktopEvents } from "@shared/types/desktop-api";

declare global {
  interface Window {
    /** Exposed by electron/preload.ts. Missing when the page runs outside Electron. */
    desktop?: DesktopApi;
    /** Messages from the main process (menu commands). Missing outside Electron. */
    desktopEvents?: DesktopEvents;
  }
}
