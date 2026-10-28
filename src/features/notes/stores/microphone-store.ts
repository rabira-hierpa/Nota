import { create } from "zustand";
import { chooseMicrophone, toMicrophones } from "@/features/notes/lib/microphones";
import type { Microphone } from "@/features/notes/types/microphone";
import { readPreference, savePreference } from "@/lib/preferences";

const STORAGE_KEY = "amharic-stt:microphone";

interface MicrophoneStore {
  microphones: Microphone[];
  selectedId: string | null;
  /** A voice note is being recorded, so dictation must wait for the microphone. */
  recording: boolean;
  /** Re-reads the connected inputs (on mount and whenever devices change). */
  refresh: () => Promise<void>;
  select: (id: string) => void;
  setRecording: (recording: boolean) => void;
}

export const useMicrophoneStore = create<MicrophoneStore>()((set, get) => ({
  microphones: [],
  selectedId: null,
  recording: false,

  refresh: async () => {
    const media = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (!media) return;
    let devices: MediaDeviceInfo[];
    try {
      devices = await media.enumerateDevices();
    } catch {
      return;
    }
    const microphones = toMicrophones(devices);
    set({ microphones, selectedId: chooseMicrophone(microphones, get().selectedId ?? readPreference(STORAGE_KEY)) });
  },

  select: (id) => {
    savePreference(STORAGE_KEY, id);
    set({ selectedId: id });
  },

  setRecording: (recording) => set({ recording }),
}));
