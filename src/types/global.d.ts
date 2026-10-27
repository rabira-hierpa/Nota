import type { DesktopApi } from "@shared/types/desktop-api";

declare global {
  interface Window {
    /** Exposed by electron/preload.ts. Missing when the page runs outside Electron. */
    desktop?: DesktopApi;
  }
}
