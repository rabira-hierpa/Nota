import { create } from "zustand";
import { chooseMicrophone, toMicrophones } from "@/features/transcriber/lib/microphones";
import type { Microphone } from "@/features/transcriber/types/microphone";

const STORAGE_KEY = "amharic-stt:microphone";

// Storage can be unavailable (private profile, blocked site data); the choice
// is a convenience, so failing to remember it is harmless.
function readSavedId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveId(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not remembered across launches; the in-memory choice still applies.
  }
}

interface MicrophoneStore {
  microphones: Microphone[];
  selectedId: string | null;
  /** Re-reads the connected inputs (on mount and whenever devices change). */
  refresh: () => Promise<void>;
  select: (id: string) => void;
}

export const useMicrophoneStore = create<MicrophoneStore>()((set, get) => ({
  microphones: [],
  selectedId: null,

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
    set({ microphones, selectedId: chooseMicrophone(microphones, get().selectedId ?? readSavedId()) });
  },

  select: (id) => {
    saveId(id);
    set({ selectedId: id });
  },
}));
