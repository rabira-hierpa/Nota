import { existsSync, renameSync } from "node:fs";
import path from "node:path";

export const DATA_FOLDER = "Nota";
/** The app's name before Nota; its folder holds the speech models, recordings and settings. */
export const LEGACY_DATA_FOLDER = "Amharic Speech to Text";

/**
 * Where the app keeps its data, inside `appData`. The first launch after the
 * rename moves the old folder across whole (one rename on the same disk), so
 * the multi-gigabyte models and every recording come along. If the move
 * fails, the old folder is used where it is.
 */
export function resolveDataFolder(appData: string): string {
  const current = path.join(appData, DATA_FOLDER);
  const legacy = path.join(appData, LEGACY_DATA_FOLDER);
  if (existsSync(current) || !existsSync(legacy)) return current;
  try {
    renameSync(legacy, current);
    return current;
  } catch (error) {
    console.error("[main] couldn't move the old data folder:", error instanceof Error ? error.message : error);
    return legacy;
  }
}
