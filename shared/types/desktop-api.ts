import type { CommandId } from "@shared/keymap";
import type { LocalModelId, ModelId, ModelStatus, SetupEvent } from "@shared/types/engine";
import type { SetLocaleInput } from "@shared/types/locale";
import type {
  AttachAudioInput,
  CreateNoteInput,
  CreateVoiceNoteInput,
  ExportNoteInput,
  LockStatus,
  Note,
  OpenedAudio,
  SetArchivedInput,
  SetFavoriteInput,
  SetLockedInput,
  SetPinnedInput,
  SetTrashedInput,
  TranscribeClipInput,
  TranscribeInput,
  UpdateNoteContentInput,
} from "@shared/types/note";
import type { Result } from "@shared/types/result";

/** The API the preload script exposes as `window.desktop`. */
export interface DesktopApi {
  listNotes(): Promise<Result<Note[]>>;
  createNote(input: CreateNoteInput): Promise<Result<Note>>;
  /** A recording saved as a new note, waiting to be transcribed. */
  createVoiceNote(input: CreateVoiceNoteInput): Promise<Result<Note>>;
  updateNoteContent(input: UpdateNoteContentInput): Promise<Result<Note>>;
  setFavorite(input: SetFavoriteInput): Promise<Result<Note>>;
  /** Moves a note to the Trash, or back out of it. */
  setTrashed(input: SetTrashedInput): Promise<Result<Note>>;
  /** Deletes a note in the Trash for good, with its recording. */
  deleteNote(id: string): Promise<Result<{ id: string }>>;
  emptyTrash(): Promise<Result<{ ids: string[] }>>;
  setPinned(input: SetPinnedInput): Promise<Result<Note>>;
  setArchived(input: SetArchivedInput): Promise<Result<Note>>;
  /** Seals a note with the app password, or opens it for good. Needs the notes unlocked. */
  setLocked(input: SetLockedInput): Promise<Result<Note>>;
  /** A locked note's text, for the editor. Needs the notes unlocked. */
  openLockedNote(id: string): Promise<Result<Note>>;
  getLockStatus(): Promise<Result<LockStatus>>;
  /** Sets the app password, once; the notes are then unlocked. */
  setLockPassword(password: string): Promise<Result<LockStatus>>;
  unlockNotes(password: string): Promise<Result<LockStatus>>;
  /** Forgets the key: locked notes need the password again. */
  lockNotes(): Promise<Result<LockStatus>>;
  /** Saves an exported note where the user picks; false if they cancelled. */
  exportNote(input: ExportNoteInput): Promise<Result<{ saved: boolean }>>;
  attachAudio(input: AttachAudioInput): Promise<Result<Note>>;
  readAudio(id: string): Promise<Result<Uint8Array>>;
  /** Asks for a recording to transcribe (a file dialog); null if the user cancelled. */
  openAudioFile(): Promise<Result<OpenedAudio | null>>;
  /** Transcribes a note's recording; the transcript replaces the note's text. */
  transcribe(input: TranscribeInput): Promise<Result<Note>>;
  /** Dictation: text for one clip of speech, nothing stored. */
  transcribeClip(input: TranscribeClipInput): Promise<Result<string>>;
  /** The models on offer, in order of preference, each with its status. */
  listModels(): Promise<Result<ModelStatus[]>>;
  /** Starts loading a model before its first request, so speech isn't kept waiting. */
  prepareModel(model: ModelId): Promise<Result<null>>;
  /** Sets a model up (runtime and download, once); progress arrives through onSetupEvent. */
  startModelSetup(model: LocalModelId): Promise<Result<null>>;
  cancelModelSetup(): Promise<Result<null>>;
  /** Whether to show the setup guide now (a fresh install that hasn't finished it). */
  getOnboarding(): Promise<Result<{ show: boolean }>>;
  completeOnboarding(): Promise<Result<null>>;
  /** The interface's language, so the menu bar can be drawn in it. */
  setLocale(input: SetLocaleInput): Promise<Result<null>>;
}

/** Messages from the main process: menu commands, and "lock everything" when the Mac sleeps. */
export interface DesktopEvents {
  /** Returns a function that stops listening. */
  onCommand(listener: (command: CommandId) => void): () => void;
  /** Output from a model setup started with startModelSetup, then whether it worked. */
  onSetupEvent(listener: (event: SetupEvent) => void): () => void;
}
