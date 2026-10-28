import type { DesktopApi } from "@shared/types/desktop-api";

/** One channel per DesktopApi method; `satisfies` keeps the two in lockstep. */
export const IPC_CHANNELS = {
  listNotes: "notes:list",
  createNote: "notes:create",
  createVoiceNote: "notes:create-voice",
  updateNoteContent: "notes:update-content",
  setFavorite: "notes:set-favorite",
  setTrashed: "notes:set-trashed",
  deleteNote: "notes:delete",
  emptyTrash: "notes:empty-trash",
  attachAudio: "notes:attach-audio",
  readAudio: "notes:read-audio",
  transcribe: "notes:transcribe",
  transcribeClip: "dictation:transcribe-clip",
  listModels: "models:list",
  prepareModel: "models:prepare",
} as const satisfies Record<keyof DesktopApi, string>;
