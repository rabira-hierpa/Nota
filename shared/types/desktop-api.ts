import type { ModelId, ModelStatus } from "@shared/types/engine";
import type {
  CreateRecordingInput,
  Recording,
  TranscribeClipInput,
  TranscribeInput,
  UpdateTranscriptInput,
} from "@shared/types/recording";
import type { Result } from "@shared/types/result";

/** The API the preload script exposes as `window.desktop`. */
export interface DesktopApi {
  listRecordings(): Promise<Result<Recording[]>>;
  createRecording(input: CreateRecordingInput): Promise<Result<Recording>>;
  readAudio(id: string): Promise<Result<Uint8Array>>;
  transcribe(input: TranscribeInput): Promise<Result<Recording>>;
  /** Dictation: text for one clip of speech, nothing stored. */
  transcribeClip(input: TranscribeClipInput): Promise<Result<string>>;
  updateTranscript(input: UpdateTranscriptInput): Promise<Result<Recording>>;
  deleteRecording(id: string): Promise<Result<{ id: string }>>;
  /** The models on offer, in order of preference, each with its status. */
  listModels(): Promise<Result<ModelStatus[]>>;
  /** Starts loading a model before its first request, so speech isn't kept waiting. */
  prepareModel(model: ModelId): Promise<Result<null>>;
}
