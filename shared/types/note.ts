import type { z } from "zod";
import type {
  attachAudioInputSchema,
  createNoteInputSchema,
  createVoiceNoteInputSchema,
  exportFormatSchema,
  exportNoteInputSchema,
  noteAudioSchema,
  noteSchema,
  setArchivedInputSchema,
  setFavoriteInputSchema,
  setLockedInputSchema,
  setPinnedInputSchema,
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
export type SetPinnedInput = z.infer<typeof setPinnedInputSchema>;
export type SetArchivedInput = z.infer<typeof setArchivedInputSchema>;
export type SetLockedInput = z.infer<typeof setLockedInputSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type ExportNoteInput = z.infer<typeof exportNoteInputSchema>;

/** Whether an app password exists, and whether locked notes can be opened right now. */
export interface LockStatus {
  hasPassword: boolean;
  unlocked: boolean;
}
