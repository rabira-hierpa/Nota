import type { DesktopApi } from "@shared/types/desktop-api";
import type { Result } from "@shared/types/result";

export const DESKTOP_ERRORS = {
  missing: "This screen only works inside the desktop app. Start it with `npm run dev`.",
  unresponsive: "The desktop app didn't respond. Try again.",
} as const;

/**
 * The renderer's only door to the main process. Stores call this; components
 * never touch `window.desktop` directly.
 */
export async function invokeDesktop<T>(call: (api: DesktopApi) => Promise<Result<T>>): Promise<Result<T>> {
  const api = typeof window === "undefined" ? undefined : window.desktop;
  if (!api) return { success: false, error: DESKTOP_ERRORS.missing };
  try {
    return await call(api);
  } catch {
    return { success: false, error: DESKTOP_ERRORS.unresponsive };
  }
}
