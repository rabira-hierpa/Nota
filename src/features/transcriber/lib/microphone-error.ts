const BLOCKED =
  "Microphone access is blocked. Allow it in System Settings → Privacy & Security → Microphone, then try again.";

const MESSAGES: Record<string, string> = {
  NotAllowedError: BLOCKED,
  SecurityError: BLOCKED,
  NotFoundError: "No microphone found. Connect one and try again.",
  NotReadableError: "The microphone is in use by another app.",
};

/** Message for a getUserMedia failure, keyed by the DOMException name. */
export function microphoneErrorMessage(errorName: string): string {
  return MESSAGES[errorName] ?? "Couldn't start recording. Try again.";
}
