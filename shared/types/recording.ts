import type { z } from "zod";
import type {
  createRecordingInputSchema,
  recordingSchema,
  transcribeClipInputSchema,
  transcribeInputSchema,
  transcriptionSchema,
  updateTranscriptInputSchema,
} from "@shared/schemas/recording";

export type Recording = z.infer<typeof recordingSchema>;
export type Transcription = z.infer<typeof transcriptionSchema>;
export type CreateRecordingInput = z.infer<typeof createRecordingInputSchema>;
export type TranscribeInput = z.infer<typeof transcribeInputSchema>;
export type TranscribeClipInput = z.infer<typeof transcribeClipInputSchema>;
export type UpdateTranscriptInput = z.infer<typeof updateTranscriptInputSchema>;
