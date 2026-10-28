import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startPcmCapture } from "@/features/transcriber/lib/pcm-capture";
import { useDictationStore } from "@/features/transcriber/stores/dictation-store";
import { useEngineStore } from "@/features/transcriber/stores/engine-store";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import type { Microphone } from "@/features/transcriber/types/microphone";
import type { DesktopApi } from "@shared/types/desktop-api";
import type { ModelStatus } from "@shared/types/engine";
import type { CreateRecordingInput, Recording } from "@shared/types/recording";
import type { Result } from "@shared/types/result";

const microphone = vi.hoisted(() => ({
  emit: (_samples: Float32Array) => undefined as void,
  stop: vi.fn(async () => undefined),
}));

vi.mock("@/features/transcriber/lib/pcm-capture", () => ({
  startPcmCapture: vi.fn(async (_microphone: Microphone | null, onSamples: (samples: Float32Array) => void) => {
    microphone.emit = onSamples;
    return { label: "Test mic", stop: microphone.stop };
  }),
}));

const RATE = 16_000;
const hohe: ModelStatus = { model: "hohe", kind: "online" };
const saved: Recording = {
  id: "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e",
  createdAt: "2026-10-28T09:00:00.000Z",
  durationMs: 2000,
  transcript: "",
  transcription: { status: "pending" },
};

function speak(ms: number, level = 0.1): void {
  const audio = Float32Array.from({ length: (RATE * ms) / 1000 }, (_, index) => (index % 2 === 0 ? level : -level));
  for (let offset = 0; offset < audio.length; offset += 1600) microphone.emit(audio.slice(offset, offset + 1600));
}

const pause = (ms: number) => speak(ms, 0);

let created: CreateRecordingInput[];
let clipReplies: Result<string>[];
let transcribe: ReturnType<typeof vi.fn>;

function fakeDesktop(): Partial<DesktopApi> {
  return {
    transcribeClip: async () => clipReplies.shift() ?? { success: true, data: "" },
    createRecording: async (input) => {
      created.push(input);
      return { success: true, data: input.dictated ? { ...saved, transcription: { status: "done", transcribedAt: saved.createdAt } } : saved };
    },
    readAudio: async () => ({ success: true, data: new Uint8Array([1]) }),
    transcribe: transcribe as DesktopApi["transcribe"],
    prepareModel: async () => ({ success: true, data: null }),
  };
}

beforeEach(() => {
  created = [];
  clipReplies = [];
  transcribe = vi.fn(async () => ({ success: true, data: saved }));
  useDictationStore.setState(useDictationStore.getInitialState());
  useRecordingsStore.setState(useRecordingsStore.getInitialState());
  useEngineStore.setState({ state: { kind: "ready", models: [hohe] }, chosen: null });
  vi.stubGlobal("window", { desktop: fakeDesktop() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("dictation", () => {
  it("shows each stretch of speech while still listening, then saves the recording with that text", async () => {
    clipReplies = [
      { success: true, data: "ሰላም" },
      { success: true, data: "ዓለም" },
    ];
    await useDictationStore.getState().start(null, hohe);
    expect(useDictationStore.getState().state.kind).toBe("listening");

    speak(1000);
    pause(800);
    await vi.waitFor(() => expect(useDictationStore.getState().text).toBe("ሰላም"));

    speak(1000);
    await useDictationStore.getState().stop();

    expect(useDictationStore.getState()).toMatchObject({ state: { kind: "idle" }, text: "ሰላም ዓለም" });
    expect(microphone.stop).toHaveBeenCalledOnce();
    expect(created).toHaveLength(1);
    expect(created[0].dictated).toEqual({ transcript: "ሰላም ዓለም", model: "hohe" });
    expect(created[0].durationMs).toBeCloseTo(2800, -2);
    expect(transcribe).not.toHaveBeenCalled();
    expect(useRecordingsStore.getState().selectedId).toBe(saved.id);
  });

  it("transcribes the whole recording instead when a clip fails", async () => {
    clipReplies = [{ success: false, error: "Hohe stopped unexpectedly. Try again." }];
    await useDictationStore.getState().start(null, hohe);

    speak(1000);
    pause(800);
    await vi.waitFor(() => expect(useDictationStore.getState().clipError).toMatch(/stopped unexpectedly/));
    await useDictationStore.getState().stop();

    expect(created[0].dictated).toBeUndefined();
    await vi.waitFor(() => expect(transcribe).toHaveBeenCalledWith({ id: saved.id, model: "hohe" }));
  });

  it("says why it can't start with a model that isn't set up", async () => {
    const offline: ModelStatus = { model: "hohe", kind: "offline", reason: "Hohe isn't set up yet." };
    await useDictationStore.getState().start(null, offline);

    expect(useDictationStore.getState().state).toEqual({ kind: "error", message: "Hohe isn't set up yet." });
    expect(startPcmCapture).not.toHaveBeenCalled();
  });

  it("refuses to save silence and names the microphone", async () => {
    await useDictationStore.getState().start(null, hohe);
    pause(2000);
    await useDictationStore.getState().stop();

    expect(useDictationStore.getState().state).toMatchObject({ kind: "error", message: expect.stringContaining("Test mic") });
    expect(created).toEqual([]);
  });
});
