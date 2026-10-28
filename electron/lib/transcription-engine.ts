import type { EngineStatus } from "@shared/types/engine";
import type { Result } from "@shared/types/result";

/** One way of turning a 16 kHz mono WAV into Amharic text. */
export interface TranscriptionEngine {
  status(): Promise<EngineStatus>;
  transcribe(audio: Uint8Array, fileName: string): Promise<Result<string>>;
  /** Starts loading the model ahead of its first request, without waiting for it. */
  prepare?(): void;
  /** Frees what the engine holds while it has no work (another model is in use). */
  release?(): void;
  dispose?(): void;
}
