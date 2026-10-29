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
  setPinned: "notes:set-pinned",
  setArchived: "notes:set-archived",
  setLocked: "notes:set-locked",
  openLockedNote: "notes:open-locked",
  getLockStatus: "lock:status",
  setLockPassword: "lock:set-password",
  unlockNotes: "lock:unlock",
  lockNotes: "lock:lock",
  exportNote: "notes:export",
  attachAudio: "notes:attach-audio",
  readAudio: "notes:read-audio",
  openAudioFile: "notes:open-audio-file",
  transcribe: "notes:transcribe",
  transcribeClip: "dictation:transcribe-clip",
  listModels: "models:list",
  prepareModel: "models:prepare",
  startModelSetup: "setup:start",
  cancelModelSetup: "setup:cancel",
  getOnboarding: "onboarding:get",
  completeOnboarding: "onboarding:complete",
  setLocale: "app:set-locale",
} as const satisfies Record<keyof DesktopApi, string>;

/** Main → renderer: a menu command (or the system asking to lock the notes). */
export const COMMAND_CHANNEL = "app:command";

/** Main → renderer: a line of model-setup output, or its end. */
export const SETUP_CHANNEL = "setup:event";
