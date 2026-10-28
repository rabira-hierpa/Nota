const BLOCKED =
  "Microphone access is blocked. Allow it in System Settings → Privacy & Security → Microphone, then try again.";

const MESSAGES: Record<string, string> = {
  NotAllowedError: BLOCKED,
  SecurityError: BLOCKED,
  NotFoundError: "No microphone found. Connect one and try again.",
  NotReadableError: "The microphone is in use by another app.",
  OverconstrainedError: "That microphone isn't connected any more. Pick another one.",
};

/** Message for a getUserMedia failure, keyed by the DOMException name. */
export function microphoneErrorMessage(errorName: string): string {
  return MESSAGES[errorName] ?? "Couldn't start recording. Try again.";
}

/** Shown instead of saving a recording that captured no sound at all. */
export function silentRecordingMessage(microphoneLabel: string | null): string {
  return microphoneLabel
    ? `No sound came from “${microphoneLabel}”. Pick another microphone and try again.`
    : "No sound was recorded. Check your microphone and try again.";
}
