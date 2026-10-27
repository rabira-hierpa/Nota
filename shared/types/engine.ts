/** Whether VoiceStudio's local speech API answered. */
export type EngineStatus =
  | { kind: "online"; url: string }
  | { kind: "offline"; url: string; reason: string };
