import { create } from "zustand";
import { useEngineStore } from "@/features/transcriber/stores/engine-store";
import { invokeDesktop } from "@/lib/desktop";
import type { CreateRecordingInput, Recording } from "@shared/types/recording";
import type { Result } from "@shared/types/result";

export type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

/** A blob: URL for the selected recording's WAV. */
interface AudioSource {
  recordingId: string;
  url: string;
}

interface RecordingsStore {
  recordings: Recording[];
  load: LoadState;
  selectedId: string | null;
  /** Recordings with a transcription request in flight. */
  transcribingIds: string[];
  audio: AudioSource | null;
  /** The last action that failed, shown until the next one starts. */
  actionError: string | null;
  loadRecordings: () => Promise<void>;
  select: (id: string | null) => Promise<void>;
  add: (input: CreateRecordingInput) => Promise<Result<Recording>>;
  transcribe: (id: string) => Promise<void>;
  saveTranscript: (id: string, transcript: string) => Promise<Result<Recording>>;
  remove: (id: string) => Promise<void>;
  dismissError: () => void;
}

const WAV_TYPE = "audio/wav";

function replaceRecording(recordings: Recording[], next: Recording): Recording[] {
  return recordings.map((recording) => (recording.id === next.id ? next : recording));
}

export const useRecordingsStore = create<RecordingsStore>()((set, get) => ({
  recordings: [],
  load: { kind: "idle" },
  selectedId: null,
  transcribingIds: [],
  audio: null,
  actionError: null,

  loadRecordings: async () => {
    if (get().load.kind === "loading") return;
    set({ load: { kind: "loading" } });
    const result = await invokeDesktop((api) => api.listRecordings());
    if (!result.success) {
      set({ load: { kind: "error", message: result.error } });
      return;
    }
    set({ recordings: result.data, load: { kind: "ready" } });
    const newest = result.data[0];
    if (newest && get().selectedId === null) await get().select(newest.id);
  },

  select: async (id) => {
    if (get().selectedId === id) return;
    const previous = get().audio;
    if (previous) URL.revokeObjectURL(previous.url);
    set({ selectedId: id, audio: null });
    if (id === null) return;

    const result = await invokeDesktop((api) => api.readAudio(id));
    const state = get();
    // The user may have moved on (or come back) while the audio loaded.
    if (state.selectedId !== id || state.audio?.recordingId === id) return;
    if (!result.success) {
      set({ actionError: result.error });
      return;
    }
    const url = URL.createObjectURL(new Blob([new Uint8Array(result.data)], { type: WAV_TYPE }));
    set({ audio: { recordingId: id, url } });
  },

  add: async (input) => {
    const result = await invokeDesktop((api) => api.createRecording(input));
    if (!result.success) return result;
    set((state) => ({ recordings: [result.data, ...state.recordings], actionError: null }));
    await get().select(result.data.id);
    void get().transcribe(result.data.id);
    return result;
  },

  transcribe: async (id) => {
    if (get().transcribingIds.includes(id)) return;
    set((state) => ({ transcribingIds: [...state.transcribingIds, id], actionError: null }));
    const result = await invokeDesktop((api) => api.transcribe(id));
    set((state) => ({
      transcribingIds: state.transcribingIds.filter((pending) => pending !== id),
      ...(result.success
        ? { recordings: replaceRecording(state.recordings, result.data) }
        : { actionError: result.error }),
    }));
    // A failed run usually means VoiceStudio went away; refresh the indicator.
    if (!result.success || result.data.transcription.status === "error") {
      void useEngineStore.getState().check();
    }
  },

  saveTranscript: (id, transcript) => {
    // Optimistic: the sidebar preview follows the editor as the user types.
    set((state) => ({
      recordings: state.recordings.map((recording) =>
        recording.id === id ? { ...recording, transcript } : recording,
      ),
    }));
    return invokeDesktop((api) => api.updateTranscript({ id, transcript }));
  },

  remove: async (id) => {
    const result = await invokeDesktop((api) => api.deleteRecording(id));
    if (!result.success) {
      set({ actionError: result.error });
      return;
    }
    const remaining = get().recordings.filter((recording) => recording.id !== id);
    set({ recordings: remaining, actionError: null });
    if (get().selectedId === id) await get().select(remaining[0]?.id ?? null);
  },

  dismissError: () => set({ actionError: null }),
}));
