import type { LocalModelId } from "@shared/types/engine";

/**
 * What the main process tells the user, in English. Kept here, not beside the
 * code that sends it, so the renderer can show each one in the interface's
 * language: it looks a message up by its English text (`src/lib/i18n`).
 */

export const HANDLER_ERRORS = {
  invalid: "That request wasn't valid.",
  notFound: "That note no longer exists.",
  state: "That can't be done to this note right now.",
  locked: "Locked notes need your password. Unlock them, then try again.",
  wrongPassword: "That password isn't right.",
  noModel: "That speech model isn't available. Pick another one.",
  setupRunning: "A setup is already running. Wait for it to finish.",
  tooLarge: "That file is too large to transcribe. Pick a recording of 30 minutes or less.",
  generic: "Something went wrong. Try again.",
} as const;

export const ENGINE_MESSAGES = {
  notRunning: "VoiceStudio isn't running. Open VoiceStudio, wait for its engine to start, then try again.",
  timedOut: "VoiceStudio took too long to answer. Try a shorter recording.",
  noModel: "VoiceStudio has no speech-recognition model installed. Install one in its Model Catalogue.",
  badKey: "VoiceStudio rejected the API key. Check OMNIVOICE_API_KEY.",
  licence:
    "VoiceStudio needs you to accept this speech model's licence first. In VoiceStudio, open Model Catalogue, accept it, then press Transcribe again.",
  unexpected: "VoiceStudio sent a response this app doesn't understand.",
} as const;

export const MODEL_NAMES: Record<LocalModelId, string> = { hohe: "Hohe", buzzasr: "BuzzASR" };

export type LocalModelMessage = "notSetUp" | "failedToStart" | "failed" | "stopped" | "timedOut";

/** A local model's messages, with its name in them. */
export function amharicMessages(model: LocalModelId): Record<LocalModelMessage, string> {
  const name = MODEL_NAMES[model];
  return {
    notSetUp: `${name} isn't set up yet. Open Settings, then the setup guide, to set it up.`,
    failedToStart: `${name} couldn't start. Run its setup again from the setup guide in Settings.`,
    failed: `${name} couldn't transcribe this recording. Try again.`,
    stopped: `${name} stopped unexpectedly. Try again.`,
    timedOut: `${name} took too long. Try a shorter recording.`,
  };
}
