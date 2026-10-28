import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMicrophoneStore } from "@/features/transcriber/stores/microphone-store";

const devices = [
  { deviceId: "default", kind: "audioinput", label: "Default - BlackHole 2ch (Virtual)" },
  { deviceId: "blackhole", kind: "audioinput", label: "BlackHole 2ch (Virtual)" },
  { deviceId: "builtin", kind: "audioinput", label: "MacBook Pro Microphone (Built-in)" },
  { deviceId: "usb", kind: "audioinput", label: "DRELANMIC (0c76:120c)" },
];

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  useMicrophoneStore.setState(useMicrophoneStore.getInitialState());
  vi.stubGlobal("navigator", { mediaDevices: { enumerateDevices: async () => devices } });
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("microphone store", () => {
  it("picks a real microphone over a silent virtual default", async () => {
    await useMicrophoneStore.getState().refresh();
    expect(useMicrophoneStore.getState().selectedId).toBe("builtin");
  });

  it("remembers the user's choice across launches", async () => {
    useMicrophoneStore.getState().select("usb");
    useMicrophoneStore.setState(useMicrophoneStore.getInitialState());

    await useMicrophoneStore.getState().refresh();

    expect(useMicrophoneStore.getState().selectedId).toBe("usb");
  });

  it("still works when storage is blocked", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    useMicrophoneStore.getState().select("usb");
    await useMicrophoneStore.getState().refresh();
    expect(useMicrophoneStore.getState().selectedId).toBe("usb");
  });
});
