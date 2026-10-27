import { describe, expect, it } from "vitest";
import { transcriptionRevision, transcriptPreview } from "@/features/transcriber/lib/recording-display";
import type { Recording } from "@shared/types/recording";

const recording = (overrides: Partial<Recording>): Recording => ({
  id: "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e",
  createdAt: "2026-10-28T09:00:00.000Z",
  durationMs: 1000,
  transcript: "",
  transcription: { status: "pending" },
  ...overrides,
});

describe("transcriptPreview", () => {
  it("shows the transcript once there is one", () => {
    expect(transcriptPreview(recording({ transcript: "  ሰላም  " }), false)).toEqual({
      text: "ሰላም",
      isTranscript: true,
    });
  });

  it("says what is happening while there is no text", () => {
    expect(transcriptPreview(recording({}), true).text).toBe("Transcribing…");
    expect(transcriptPreview(recording({}), false).text).toBe("Not transcribed yet");
    expect(transcriptPreview(recording({ transcription: { status: "error", message: "x" } }), false).text).toBe(
      "Transcription failed",
    );
  });
});

describe("transcriptionRevision", () => {
  it("changes when the engine produces a new result", () => {
    const first = recording({ transcription: { status: "done", transcribedAt: "2026-10-28T09:00:00.000Z" } });
    const second = recording({ transcription: { status: "done", transcribedAt: "2026-10-28T09:05:00.000Z" } });
    expect(transcriptionRevision(first)).not.toBe(transcriptionRevision(second));
  });

  it("ignores edits to the transcript", () => {
    expect(transcriptionRevision(recording({ transcript: "a" }))).toBe(transcriptionRevision(recording({})));
  });
});
