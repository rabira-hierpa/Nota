import type { Recording } from "@shared/types/recording";

export interface TranscriptPreview {
  text: string;
  /** True when `text` is the Amharic transcript rather than a status line. */
  isTranscript: boolean;
}

/** The second line of a recording in the sidebar. */
export function transcriptPreview(recording: Recording, transcribing: boolean): TranscriptPreview {
  if (transcribing) return { text: "Transcribing…", isTranscript: false };
  const text = recording.transcript.trim();
  if (text) return { text, isTranscript: true };
  switch (recording.transcription.status) {
    case "pending":
      return { text: "Not transcribed yet", isTranscript: false };
    case "error":
      return { text: "Transcription failed", isTranscript: false };
    case "done":
      return { text: "No speech detected", isTranscript: false };
  }
}

/** Placeholder for the transcript editor when there is no text yet. */
export function editorPlaceholder(recording: Recording, transcribing: boolean): string {
  if (transcribing) return "Transcribing your recording…";
  switch (recording.transcription.status) {
    case "pending":
      return "Not transcribed yet. Press Transcribe, or type the text yourself.";
    case "error":
      return "Transcription failed. Try again, or type the text yourself.";
    case "done":
      return "No speech was detected. Type the text yourself if you like.";
  }
}

/**
 * Changes whenever the engine produces a new result, so the editor remounts
 * with the fresh text, and stays put while the user is typing.
 */
export function transcriptionRevision(recording: Recording): string {
  switch (recording.transcription.status) {
    case "pending":
      return "pending";
    case "done":
      return `done:${recording.transcription.transcribedAt}`;
    case "error":
      return `error:${recording.transcription.message}`;
  }
}
