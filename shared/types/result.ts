/**
 * Every IPC call resolves to one of these instead of throwing, so the renderer
 * always gets a typed, human-readable outcome (.claude/rules/electron-ipc.md).
 */
export type Result<T> = { success: true; data: T } | { success: false; error: string };
