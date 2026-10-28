import type { EngineStatus } from "@shared/types/engine";
import type { Result } from "@shared/types/result";

/** What the IPC handlers need from a speech-to-text engine. */
export interface TranscriptionEngine {
  status(): Promise<EngineStatus>;
  /** `audio` is a 16 kHz mono WAV; failures come back as readable messages. */
  transcribe(audio: Uint8Array, fileName: string): Promise<Result<string>>;
  /** Releases anything the engine holds (a helper process) when the app quits. */
  dispose?(): void;
}
