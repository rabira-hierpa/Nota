import type { ModelId, ModelStatus } from "@shared/types/engine";
import type {
  AttachAudioInput,
  CreateNoteInput,
  CreateVoiceNoteInput,
  Note,
  SetFavoriteInput,
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
  attachAudio(input: AttachAudioInput): Promise<Result<Note>>;
  readAudio(id: string): Promise<Result<Uint8Array>>;
  /** Transcribes a note's recording; the transcript replaces the note's text. */
  transcribe(input: TranscribeInput): Promise<Result<Note>>;
  /** Dictation: text for one clip of speech, nothing stored. */
  transcribeClip(input: TranscribeClipInput): Promise<Result<string>>;
  /** The models on offer, in order of preference, each with its status. */
  listModels(): Promise<Result<ModelStatus[]>>;
  /** Starts loading a model before its first request, so speech isn't kept waiting. */
  prepareModel(model: ModelId): Promise<Result<null>>;
}
