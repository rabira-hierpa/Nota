/** Which transcription engine the main process is using. */
export type EngineName = "amharic-model" | "voicestudio";

/** Whether that engine can transcribe right now. */
export type EngineStatus =
  | { kind: "online"; engine: EngineName }
  | { kind: "offline"; engine: EngineName; reason: string };
