import type { DesktopApi } from "@shared/types/desktop-api";

/** One channel per DesktopApi method; `satisfies` keeps the two in lockstep. */
export const IPC_CHANNELS = {
  listRecordings: "recordings:list",
  createRecording: "recordings:create",
  readAudio: "recordings:read-audio",
  transcribe: "recordings:transcribe",
  transcribeClip: "dictation:transcribe-clip",
  updateTranscript: "recordings:update-transcript",
  deleteRecording: "recordings:delete",
  listModels: "models:list",
  prepareModel: "models:prepare",
} as const satisfies Record<keyof DesktopApi, string>;
