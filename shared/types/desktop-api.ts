import type { EngineStatus } from "@shared/types/engine";
import type { CreateRecordingInput, Recording, UpdateTranscriptInput } from "@shared/types/recording";
import type { Result } from "@shared/types/result";

/** The API the preload script exposes as `window.desktop`. */
export interface DesktopApi {
  listRecordings(): Promise<Result<Recording[]>>;
  createRecording(input: CreateRecordingInput): Promise<Result<Recording>>;
  readAudio(id: string): Promise<Result<Uint8Array>>;
  transcribe(id: string): Promise<Result<Recording>>;
  updateTranscript(input: UpdateTranscriptInput): Promise<Result<Recording>>;
  deleteRecording(id: string): Promise<Result<{ id: string }>>;
  engineStatus(): Promise<Result<EngineStatus>>;
}
