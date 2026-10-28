import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEngineStore } from "@/features/notes/stores/engine-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import { DESKTOP_ERRORS } from "@/lib/desktop";
import type { DesktopApi } from "@shared/types/desktop-api";
import type { Note } from "@shared/types/note";

const voiceNote: Note = {
  id: "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e",
  createdAt: "2026-10-28T09:00:00.000Z",
  updatedAt: "2026-10-28T09:00:00.000Z",
  content: "",
  text: "",
  favorite: false,
  pinned: false,
  archivedAt: null,
  trashedAt: null,
  audio: { durationMs: 2000, transcription: { status: "pending" } },
  lock: null,
};
const transcribed: Note = {
  ...voiceNote,
  content: "<p>ሰላም ዓለም</p>",
  text: "ሰላም ዓለም",
  updatedAt: "2026-10-28T09:00:05.000Z",
  audio: { durationMs: 2000, transcription: { status: "done", transcribedAt: "2026-10-28T09:00:05.000Z", model: "hohe" } },
};
const typed: Note = {
  ...voiceNote,
  id: "9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d",
  text: "የስብሰባ ማስታወሻ #work",
  content: "<p>የስብሰባ ማስታወሻ #work</p>",
  updatedAt: "2026-10-27T09:00:00.000Z",
  audio: null,
};

function fakeDesktop(overrides: Partial<DesktopApi> = {}): DesktopApi {
  const ok = <T,>(data: T) => Promise.resolve({ success: true as const, data });
  return {
    listNotes: () => ok([]),
    createNote: (input) => ok({ ...typed, id: "7b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e", ...input }),
    createVoiceNote: () => ok(voiceNote),
    updateNoteContent: ({ id, content, text }) => ok({ ...typed, id, content, text }),
    setFavorite: ({ id, favorite }) => ok({ ...typed, id, favorite }),
    setTrashed: ({ id, trashed }) => ok({ ...typed, id, trashedAt: trashed ? "2026-10-28T10:00:00.000Z" : null }),
    deleteNote: (id) => ok({ id }),
    emptyTrash: () => ok({ ids: [] }),
    setPinned: ({ id, pinned }) => ok({ ...typed, id, pinned }),
    setArchived: ({ id, archived }) => ok({ ...typed, id, archivedAt: archived ? "2026-10-28T10:00:00.000Z" : null }),
    setLocked: ({ id, locked }) => ok({ ...typed, id, lock: locked ? { body: "sealed" } : null }),
    openLockedNote: (id) => ok({ ...typed, id, lock: { body: "sealed" }, text: "opened text", content: "<p>opened text</p>" }),
    getLockStatus: () => ok({ hasPassword: true, unlocked: false }),
    setLockPassword: () => ok({ hasPassword: true, unlocked: true }),
    unlockNotes: () => ok({ hasPassword: true, unlocked: true }),
    lockNotes: () => ok({ hasPassword: true, unlocked: false }),
    exportNote: () => ok({ saved: true }),
    attachAudio: () => ok(transcribed),
    readAudio: () => ok(new Uint8Array([1, 2, 3])),
    transcribe: () => ok(transcribed),
    transcribeClip: () => ok("ሰላም"),
    listModels: () =>
      ok([
        { model: "hohe" as const, kind: "online" as const },
        { model: "buzzasr" as const, kind: "online" as const },
      ]),
    prepareModel: () => ok(null),
    ...overrides,
  };
}

beforeEach(() => {
  useNotesStore.setState(useNotesStore.getInitialState());
  useEngineStore.setState({
    state: { kind: "ready", models: [{ model: "hohe", kind: "online" }, { model: "buzzasr", kind: "online" }] },
    chosen: null,
  });
  vi.stubGlobal("URL", { createObjectURL: () => "blob:audio", revokeObjectURL: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("createVoiceNote", () => {
  it("saves, opens, loads the audio and transcribes the new voice note", async () => {
    vi.stubGlobal("window", { desktop: fakeDesktop() });

    await useNotesStore.getState().createVoiceNote({ audio: new Uint8Array(100), durationMs: 2000 });
    await vi.waitFor(() => expect(useNotesStore.getState().transcribingIds).toEqual([]));

    const state = useNotesStore.getState();
    expect(state.selectedId).toBe(voiceNote.id);
    expect(state.audio?.noteId).toBe(voiceNote.id);
    expect(state.notes).toEqual([transcribed]);
    // The editor reloads, since the transcript replaced the note's text.
    expect(state.textVersions[voiceNote.id]).toBe(1);
  });
});

describe("transcribe", () => {
  it("uses the model the user picked", async () => {
    const transcribe = vi.fn(fakeDesktop().transcribe);
    vi.stubGlobal("window", { desktop: fakeDesktop({ transcribe }) });
    useEngineStore.setState({ chosen: "buzzasr" });

    await useNotesStore.getState().transcribe(voiceNote.id);

    expect(transcribe).toHaveBeenCalledWith({ id: voiceNote.id, model: "buzzasr" });
  });

  it("explains when no model is available instead of calling the engine", async () => {
    const transcribe = vi.fn();
    vi.stubGlobal("window", { desktop: fakeDesktop({ transcribe }) });
    useEngineStore.setState({ state: { kind: "unreachable", reason: "no app" } });

    await useNotesStore.getState().transcribe(voiceNote.id);

    expect(transcribe).not.toHaveBeenCalled();
    expect(useNotesStore.getState().actionError).toMatch(/No speech model/);
  });
});

describe("loadNotes", () => {
  it("opens the most recent note", async () => {
    vi.stubGlobal("window", { desktop: fakeDesktop({ listNotes: async () => ({ success: true, data: [typed, transcribed] }) }) });

    await useNotesStore.getState().loadNotes();

    expect(useNotesStore.getState()).toMatchObject({ load: { kind: "ready" }, selectedId: transcribed.id });
  });

  it("explains itself outside Electron", async () => {
    vi.stubGlobal("window", {});
    await useNotesStore.getState().loadNotes();
    expect(useNotesStore.getState().load).toEqual({ kind: "error", message: DESKTOP_ERRORS.missing });
  });
});

describe("createNote", () => {
  it("starts a note in a tag's list with that tag, so it stays in the list", async () => {
    const createNote = vi.fn(fakeDesktop().createNote);
    vi.stubGlobal("window", { desktop: fakeDesktop({ createNote }) });
    useNotesStore.setState({ section: { kind: "tag", path: "ስራ" } });

    await useNotesStore.getState().createNote();

    expect(createNote).toHaveBeenCalledWith({ content: "<h1></h1><p>#ስራ</p>", text: "#ስራ" });
    expect(useNotesStore.getState().section).toEqual({ kind: "tag", path: "ስራ" });
  });

  it("leaves the Trash for the new note, and clears the search", async () => {
    vi.stubGlobal("window", { desktop: fakeDesktop() });
    useNotesStore.setState({ section: { kind: "trash" }, search: "old" });

    await useNotesStore.getState().createNote();

    expect(useNotesStore.getState()).toMatchObject({ section: { kind: "all" }, search: "" });
  });
});

describe("saveContent", () => {
  it("updates the list's title and preview before the save returns", () => {
    vi.stubGlobal("window", { desktop: fakeDesktop({ updateNoteContent: () => new Promise(() => undefined) }) });
    useNotesStore.setState({ notes: [typed] });

    void useNotesStore.getState().saveContent(typed.id, "<p>አዲስ</p>", "አዲስ");

    expect(useNotesStore.getState().notes[0]).toMatchObject({ text: "አዲስ", content: "<p>አዲስ</p>" });
  });
});

describe("toggleFavorite", () => {
  it("keeps text the editor saved after the request went out", async () => {
    vi.stubGlobal("window", { desktop: fakeDesktop() });
    const edited = { ...typed, text: "newer", updatedAt: "2026-10-28T12:00:00.000Z" };
    useNotesStore.setState({ notes: [edited] });

    await useNotesStore.getState().toggleFavorite(typed.id);

    expect(useNotesStore.getState().notes[0]).toMatchObject({ favorite: true, text: "newer" });
  });
});

describe("moveToTrash", () => {
  it("opens the next note in the list, as Bear does", async () => {
    vi.stubGlobal("window", { desktop: fakeDesktop() });
    useNotesStore.setState({ notes: [transcribed, typed], selectedId: transcribed.id });

    await useNotesStore.getState().moveToTrash(transcribed.id);

    const state = useNotesStore.getState();
    expect(state.notes.find((note) => note.id === transcribed.id)?.trashedAt).not.toBeNull();
    expect(state.selectedId).toBe(typed.id);
  });
});

describe("showSection", () => {
  it("opens the section's first note when the open one isn't in it", () => {
    vi.stubGlobal("window", { desktop: fakeDesktop() });
    useNotesStore.setState({ notes: [transcribed, typed], selectedId: transcribed.id });

    useNotesStore.getState().showSection({ kind: "tag", path: "work" });

    expect(useNotesStore.getState().selectedId).toBe(typed.id);
  });
});

describe("select", () => {
  it("keeps only the audio of the note the user ended on", async () => {
    const other = { ...voiceNote, id: "9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d" };
    vi.stubGlobal("window", { desktop: fakeDesktop() });
    useNotesStore.setState({ notes: [voiceNote, other] });

    await Promise.all([useNotesStore.getState().select(voiceNote.id), useNotesStore.getState().select(other.id)]);

    expect(useNotesStore.getState().audio?.noteId).toBe(other.id);
  });
});
