import type { z } from "zod";
import type {
  createRecordingInputSchema,
  recordingSchema,
  transcriptionSchema,
  updateTranscriptInputSchema,
} from "@shared/schemas/recording";

export type Recording = z.infer<typeof recordingSchema>;
export type Transcription = z.infer<typeof transcriptionSchema>;
export type CreateRecordingInput = z.infer<typeof createRecordingInputSchema>;
export type UpdateTranscriptInput = z.infer<typeof updateTranscriptInputSchema>;
