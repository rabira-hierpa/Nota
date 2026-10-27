import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import { DESKTOP_ERRORS } from "@/lib/desktop";
import type { DesktopApi } from "@shared/types/desktop-api";
import type { Recording } from "@shared/types/recording";

const pending: Recording = {
  id: "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e",
  createdAt: "2026-10-28T09:00:00.000Z",
  durationMs: 2000,
  transcript: "",
  transcription: { status: "pending" },
};
const transcribed: Recording = {
  ...pending,
  transcript: "ሰላም ዓለም",
  transcription: { status: "done", transcribedAt: "2026-10-28T09:00:05.000Z" },
};

function fakeDesktop(overrides: Partial<DesktopApi> = {}): DesktopApi {
  return {
    listRecordings: async () => ({ success: true, data: [] }),
    createRecording: async () => ({ success: true, data: pending }),
    readAudio: async () => ({ success: true, data: new Uint8Array([1, 2, 3]) }),
    transcribe: async () => ({ success: true, data: transcribed }),
    updateTranscript: async ({ transcript }) => ({ success: true, data: { ...pending, transcript } }),
    deleteRecording: async (id) => ({ success: true, data: { id } }),
    engineStatus: async () => ({ success: true, data: { kind: "online", url: "http://127.0.0.1:3900" } }),
    ...overrides,
  };
}

beforeEach(() => useRecordingsStore.setState(useRecordingsStore.getInitialState()));
afterEach(() => vi.unstubAllGlobals());

describe("add", () => {
  it("saves, selects, loads the audio and transcribes the new recording", async () => {
    vi.stubGlobal("window", { desktop: fakeDesktop() });

    await useRecordingsStore.getState().add({ audio: new Uint8Array(100), durationMs: 2000 });
    await vi.waitFor(() => expect(useRecordingsStore.getState().transcribingIds).toEqual([]));

    const state = useRecordingsStore.getState();
    expect(state.selectedId).toBe(pending.id);
    expect(state.audio?.recordingId).toBe(pending.id);
    expect(state.recordings).toEqual([transcribed]);
  });
});

describe("loadRecordings", () => {
  it("selects the newest recording", async () => {
    vi.stubGlobal("window", { desktop: fakeDesktop({ listRecordings: async () => ({ success: true, data: [transcribed] }) }) });
    await useRecordingsStore.getState().loadRecordings();
    expect(useRecordingsStore.getState()).toMatchObject({ load: { kind: "ready" }, selectedId: transcribed.id });
  });

  it("explains itself outside Electron", async () => {
    vi.stubGlobal("window", {});
    await useRecordingsStore.getState().loadRecordings();
    expect(useRecordingsStore.getState().load).toEqual({ kind: "error", message: DESKTOP_ERRORS.missing });
  });
});

describe("select", () => {
  it("keeps only the audio of the recording the user ended on", async () => {
    const other = { ...pending, id: "9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d" };
    vi.stubGlobal("window", { desktop: fakeDesktop() });
    useRecordingsStore.setState({ recordings: [pending, other] });

    const first = useRecordingsStore.getState().select(pending.id);
    const second = useRecordingsStore.getState().select(other.id);
    await Promise.all([first, second]);

    expect(useRecordingsStore.getState().audio?.recordingId).toBe(other.id);
  });
});

describe("saveTranscript", () => {
  it("updates the sidebar preview before the save returns", () => {
    vi.stubGlobal("window", { desktop: fakeDesktop({ updateTranscript: () => new Promise(() => undefined) }) });
    useRecordingsStore.setState({ recordings: [pending] });

    void useRecordingsStore.getState().saveTranscript(pending.id, "አዲስ");

    expect(useRecordingsStore.getState().recordings[0].transcript).toBe("አዲስ");
  });
});

describe("remove", () => {
  it("moves the selection to the next recording", async () => {
    const other = { ...transcribed, id: "9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d" };
    vi.stubGlobal("window", { desktop: fakeDesktop() });
    useRecordingsStore.setState({ recordings: [pending, other], selectedId: pending.id });

    await useRecordingsStore.getState().remove(pending.id);

    expect(useRecordingsStore.getState()).toMatchObject({ recordings: [other], selectedId: other.id });
  });
});
