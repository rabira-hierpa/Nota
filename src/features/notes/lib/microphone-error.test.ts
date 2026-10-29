import { describe, expect, it } from "vitest";
import { microphoneErrorMessage, silentRecordingMessage } from "@/features/notes/lib/microphone-error";
import { am } from "@/lib/i18n/am";

describe("silentRecordingMessage", () => {
  it("names the microphone so the user knows what to change", () => {
    expect(silentRecordingMessage("BlackHole 2ch (Virtual)")).toBe(
      "No sound came from “BlackHole 2ch (Virtual)”. Pick another microphone and try again.",
    );
  });

  it("still helps when the device is unknown", () => {
    expect(silentRecordingMessage(null)).toBe("No sound was recorded. Check your microphone and try again.");
  });
});

describe("microphoneErrorMessage", () => {
  it("explains an unplugged saved microphone", () => {
    expect(microphoneErrorMessage("OverconstrainedError")).toBe(
      "That microphone isn't connected any more. Pick another one.",
    );
  });

  it("falls back to a generic message", () => {
    expect(microphoneErrorMessage("")).toBe("Couldn't start recording. Try again.");
  });
});

describe("in Amharic", () => {
  it("says the same things in Amharic", () => {
    expect(microphoneErrorMessage("NotFoundError", am.errors.microphone)).toBe("ማይክሮፎን አልተገኘም። አንዱን ያገናኙና እንደገና ይሞክሩ።");
    expect(silentRecordingMessage("MacBook Pro Microphone", am.errors.microphone)).toContain("«MacBook Pro Microphone»");
  });
});
