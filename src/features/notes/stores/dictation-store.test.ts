import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startPcmCapture } from "@/features/notes/lib/pcm-capture";
import { useDictationStore } from "@/features/notes/stores/dictation-store";
import { useEngineStore } from "@/features/notes/stores/engine-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import type { Microphone } from "@/features/notes/types/microphone";
import type { DesktopApi } from "@shared/types/desktop-api";
import type { ModelStatus } from "@shared/types/engine";
import type { AttachAudioInput, Note } from "@shared/types/note";
import type { Result } from "@shared/types/result";

const microphone = vi.hoisted(() => ({
  emit: (_samples: Float32Array) => undefined as void,
  stop: vi.fn(async () => undefined),
}));

vi.mock("@/features/notes/lib/pcm-capture", () => ({
  startPcmCapture: vi.fn(async (_microphone: Microphone | null, onSamples: (samples: Float32Array) => void) => {
    microphone.emit = onSamples;
    return { label: "Test mic", stop: microphone.stop };
  }),
}));

const RATE = 16_000;
const hohe: ModelStatus = { model: "hohe", kind: "online" };
const note: Note = {
  id: "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e",
  createdAt: "2026-10-28T09:00:00.000Z",
  updatedAt: "2026-10-28T09:00:00.000Z",
  content: "<p>ሰላም</p>",
  text: "ሰላም",
  favorite: false,
  trashedAt: null,
  audio: null,
};

function speak(ms: number, level = 0.1): void {
  const audio = Float32Array.from({ length: (RATE * ms) / 1000 }, (_, index) => (index % 2 === 0 ? level : -level));
  for (let offset = 0; offset < audio.length; offset += 1600) microphone.emit(audio.slice(offset, offset + 1600));
}

const pause = (ms: number) => speak(ms, 0);

let attached: AttachAudioInput[];
let clipReplies: Result<string>[];
let typed: string[];

function fakeDesktop(): Partial<DesktopApi> {
  return {
    transcribeClip: async () => clipReplies.shift() ?? { success: true, data: "" },
    attachAudio: async (input) => {
      attached.push(input);
      return { success: true, data: { ...note, audio: { durationMs: input.durationMs, transcription: { status: "pending" } } } };
    },
    updateNoteContent: async ({ id, content, text }) => ({ success: true, data: { ...note, id, content, text } }),
    readAudio: async () => ({ success: true, data: new Uint8Array([1]) }),
    prepareModel: async () => ({ success: true, data: null }),
  };
}

const target = () => ({ noteId: note.id, insert: (text: string) => void typed.push(text) });

beforeEach(() => {
  attached = [];
  clipReplies = [];
  typed = [];
  useDictationStore.setState(useDictationStore.getInitialState());
  useNotesStore.setState({ ...useNotesStore.getInitialState(), notes: [note], selectedId: note.id });
  useEngineStore.setState({ state: { kind: "ready", models: [hohe] }, chosen: null });
  vi.stubGlobal("window", { desktop: fakeDesktop() });
  vi.stubGlobal("URL", { createObjectURL: () => "blob:audio", revokeObjectURL: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("dictation", () => {
  it("types each stretch of speech into the note while still listening, then keeps the audio with it", async () => {
    clipReplies = [
      { success: true, data: "ሰላም" },
      { success: true, data: " ዓለም " },
    ];
    await useDictationStore.getState().start(null, hohe, target());
    expect(useDictationStore.getState().state.kind).toBe("listening");

    speak(1000);
    pause(800);
    await vi.waitFor(() => expect(typed).toEqual(["ሰላም"]));
    expect(useDictationStore.getState().state.kind).toBe("listening");

    speak(1000);
    await useDictationStore.getState().stop();

    expect(useDictationStore.getState().state).toEqual({ kind: "idle" });
    expect(typed).toEqual(["ሰላም", "ዓለም"]);
    expect(microphone.stop).toHaveBeenCalledOnce();
    expect(attached).toHaveLength(1);
    expect(attached[0]).toMatchObject({ id: note.id, transcribedBy: "hohe" });
    expect(attached[0].durationMs).toBeCloseTo(2800, -2);
  });

  it("keeps listening when a clip fails, and leaves the audio to be transcribed in full", async () => {
    clipReplies = [{ success: false, error: "Hohe stopped unexpectedly. Try again." }];
    await useDictationStore.getState().start(null, hohe, target());

    speak(1000);
    pause(800);
    await vi.waitFor(() => expect(useDictationStore.getState().clipError).toMatch(/stopped unexpectedly/));
    expect(useDictationStore.getState().state.kind).toBe("listening");
    await useDictationStore.getState().stop();

    expect(attached[0].transcribedBy).toBeUndefined();
  });

  it("doesn't replace a recording the note already has", async () => {
    useNotesStore.setState({ notes: [{ ...note, audio: { durationMs: 900, transcription: { status: "pending" } } }] });
    clipReplies = [{ success: true, data: "ሰላም" }];
    await useDictationStore.getState().start(null, hohe, target());

    speak(1000);
    await useDictationStore.getState().stop();

    expect(typed).toEqual(["ሰላም"]);
    expect(attached).toEqual([]);
  });

  it("appends the last words to the note itself once its editor has closed", async () => {
    clipReplies = [{ success: true, data: "ዓለም" }];
    await useDictationStore.getState().start(null, hohe, target());

    speak(1000);
    useDictationStore.getState().detach(note.id);
    await vi.waitFor(() => expect(useDictationStore.getState().state.kind).toBe("idle"));

    expect(typed).toEqual([]);
    expect(useNotesStore.getState().notes[0].text).toBe("ሰላም\nዓለም");
  });

  it("says why it can't start with a model that isn't set up", async () => {
    const offline: ModelStatus = { model: "hohe", kind: "offline", reason: "Hohe isn't set up yet." };
    await useDictationStore.getState().start(null, offline, target());

    expect(useDictationStore.getState().state).toEqual({ kind: "error", message: "Hohe isn't set up yet." });
    expect(startPcmCapture).not.toHaveBeenCalled();
  });

  it("keeps nothing from silence and names the microphone", async () => {
    await useDictationStore.getState().start(null, hohe, target());
    pause(2000);
    await useDictationStore.getState().stop();

    expect(useDictationStore.getState().state).toMatchObject({ kind: "error", message: expect.stringContaining("Test mic") });
    expect(attached).toEqual([]);
  });
});
