import type { EngineStatus } from "@shared/types/engine";
import type { Result } from "@shared/types/result";

export interface TranscribeOptions {
  /** Put back the sentence ends the model leaves out: for whole recordings, not dictated phrases. */
  punctuate?: boolean;
}

/** One way of turning a 16 kHz mono WAV into Amharic text. */
export interface TranscriptionEngine {
  /** Ships inside the app: nothing to set up. */
  readonly builtIn?: boolean;
  status(): Promise<EngineStatus>;
  transcribe(audio: Uint8Array, fileName: string, options?: TranscribeOptions): Promise<Result<string>>;
  /** Starts loading the model ahead of its first request, without waiting for it. */
  prepare?(): void;
  /** Frees what the engine holds while it has no work (another model is in use). */
  release?(): void;
  dispose?(): void;
}
