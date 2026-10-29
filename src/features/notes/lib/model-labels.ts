import type { ModelId } from "@shared/types/engine";

/** Each model's name: a proper noun, the same in every language. What else is said about one is in the messages. */
export const MODEL_NAMES: Record<ModelId, string> = {
  hohe: "Hohe",
  buzzasr: "BuzzASR",
  voicestudio: "VoiceStudio",
};
