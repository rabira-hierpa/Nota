import type { z } from "zod";
import type {
  attachAudioInputSchema,
  createNoteInputSchema,
  createVoiceNoteInputSchema,
  noteAudioSchema,
  noteSchema,
  setFavoriteInputSchema,
  setTrashedInputSchema,
  transcribeClipInputSchema,
  transcribeInputSchema,
  transcriptionSchema,
  updateNoteContentInputSchema,
} from "@shared/schemas/note";

export type Note = z.infer<typeof noteSchema>;
export type NoteAudio = z.infer<typeof noteAudioSchema>;
export type Transcription = z.infer<typeof transcriptionSchema>;
export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;
export type CreateVoiceNoteInput = z.infer<typeof createVoiceNoteInputSchema>;
export type UpdateNoteContentInput = z.infer<typeof updateNoteContentInputSchema>;
export type SetFavoriteInput = z.infer<typeof setFavoriteInputSchema>;
export type SetTrashedInput = z.infer<typeof setTrashedInputSchema>;
export type AttachAudioInput = z.infer<typeof attachAudioInputSchema>;
export type TranscribeInput = z.infer<typeof transcribeInputSchema>;
export type TranscribeClipInput = z.infer<typeof transcribeClipInputSchema>;
