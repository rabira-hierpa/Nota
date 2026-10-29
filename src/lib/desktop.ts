import { commandIdSchema } from "@shared/keymap";
import { setupEventSchema } from "@shared/schemas/engine";
import type { SetupEvent } from "@shared/types/engine";
import type { CommandId } from "@shared/keymap";
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

/**
 * Menu commands from the main process. The id is checked against the known
 * commands, since it crossed a process boundary. Returns a function that
 * stops listening; outside Electron there is nothing to hear.
 */
export function subscribeToCommands(listener: (command: CommandId) => void): () => void {
  const events = typeof window === "undefined" ? undefined : window.desktopEvents;
  if (!events) return () => undefined;
  return events.onCommand((command) => {
    const parsed = commandIdSchema.safeParse(command);
    if (parsed.success) listener(parsed.data);
  });
}

/** Progress from a model setup; validated like any message from another process. */
export function subscribeToSetup(listener: (event: SetupEvent) => void): () => void {
  const events = typeof window === "undefined" ? undefined : window.desktopEvents;
  if (!events) return () => undefined;
  return events.onSetupEvent((event) => {
    const parsed = setupEventSchema.safeParse(event);
    if (parsed.success) listener(parsed.data);
  });
}
