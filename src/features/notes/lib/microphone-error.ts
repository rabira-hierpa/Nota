import { currentMessages } from "@/lib/i18n";
import type { Messages } from "@/lib/i18n";

type MicrophoneWords = Messages["errors"]["microphone"];

const BY_ERROR: Record<string, keyof Omit<MicrophoneWords, "silentFrom">> = {
  NotAllowedError: "blocked",
  SecurityError: "blocked",
  NotFoundError: "notFound",
  NotReadableError: "inUse",
  OverconstrainedError: "gone",
};

/** Message for a getUserMedia failure, keyed by the DOMException name, in the interface's language. */
export function microphoneErrorMessage(errorName: string, words: MicrophoneWords = currentMessages().errors.microphone): string {
  return words[BY_ERROR[errorName] ?? "failed"];
}

/** Shown instead of saving a recording that captured no sound at all. */
export function silentRecordingMessage(
  microphoneLabel: string | null,
  words: MicrophoneWords = currentMessages().errors.microphone,
): string {
  return microphoneLabel ? words.silentFrom(microphoneLabel) : words.silent;
}
