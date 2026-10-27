import type { DesktopApi } from "@shared/types/desktop-api";

/** One channel per DesktopApi method; `satisfies` keeps the two in lockstep. */
export const IPC_CHANNELS = {
  listRecordings: "recordings:list",
  createRecording: "recordings:create",
  readAudio: "recordings:read-audio",
  transcribe: "recordings:transcribe",
  updateTranscript: "recordings:update-transcript",
  deleteRecording: "recordings:delete",
  engineStatus: "engine:status",
} as const satisfies Record<keyof DesktopApi, string>;
