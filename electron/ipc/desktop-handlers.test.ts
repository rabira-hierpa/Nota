import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDesktopHandlers, HANDLER_ERRORS } from "@main/ipc/desktop-handlers";
import type { Engines } from "@main/ipc/desktop-handlers";
import { ModelSetup } from "@main/lib/model-setup";
import { NoteVault } from "@main/lib/note-vault";
import { Onboarding } from "@main/lib/onboarding";
import { NotesRepo } from "@main/lib/notes-repo";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import type { ModelId } from "@shared/types/engine";
import type { Locale } from "@shared/types/locale";
import type { CreateNoteInput, CreateVoiceNoteInput, ExportNoteInput } from "@shared/types/note";
import type { Result } from "@shared/types/result";

let dir: string;
let repo: NotesRepo;
let vault: NoteVault;
let exported: ExportNoteInput[];
let engineResult: Result<string>;
let pickedFile: string | null;
let locales: Locale[];

function fakeEngine() {
  return {
    status: (): ReturnType<TranscriptionEngine["status"]> => Promise.resolve({ kind: "online" }),
    transcribe: vi.fn(() => Promise.resolve(engineResult)),
    release: vi.fn<() => void>(),
    prepare: vi.fn<() => void>(),
  } satisfies TranscriptionEngine;
}

let hohe: ReturnType<typeof fakeEngine>;
let buzzasr: ReturnType<typeof fakeEngine>;
let engines: Engines;

const voice: CreateVoiceNoteInput = { audio: new Uint8Array(100), durationMs: 2000 };
const missingId = "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e";

function handlers() {
  return createDesktopHandlers({
    repo,
    engines,
    vault,
    saveExport: async (input) => {
      exported.push(input);
      return true;
    },
    pickAudioFile: async () => pickedFile,
    onLocale: (locale) => locales.push(locale),
    // A setup script that does nothing; the runner itself is tested on its own.
    setup: new ModelSetup(dir, dir, () => undefined),
    onboarding: new Onboarding(path.join(dir, "onboarded"), async () => (await repo.list()).length > 0, false),
  });
}

async function voiceNote() {
  const result = await handlers().createVoiceNote(voice);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "nota-ipc-"));
  vault = new NoteVault(path.join(dir, "vault.json"));
  repo = new NotesRepo(path.join(dir, "notes"), { vault });
  exported = [];
  hohe = fakeEngine();
  buzzasr = fakeEngine();
  engines = new Map<ModelId, TranscriptionEngine>([
    ["hohe", hohe],
    ["buzzasr", buzzasr],
  ]);
  engineResult = { success: true, data: "ሰላም ዓለም" };
  pickedFile = null;
  locales = [];
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("createDesktopHandlers", () => {
  it("rejects payloads that do not match the contract", async () => {
    const api = handlers();
    const tooShort = { audio: new Uint8Array(10), durationMs: 2000 };
    const extraField = { content: "", text: "", path: "/etc/passwd" } as CreateNoteInput;
    const longClip = { audio: new Uint8Array(3 * 1024 * 1024), model: "hohe" as const };
    const unknownModel = { id: missingId, model: "gpt" as ModelId };
    const hugeNote = { content: "x".repeat(1_000_001), text: "" };

    expect(await api.createVoiceNote(tooShort)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await api.createNote(extraField)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await api.createNote(hugeNote)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await api.readAudio("../../etc/passwd")).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await api.deleteNote("../x")).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await api.transcribeClip(longClip)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await api.transcribe(unknownModel)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(hohe.transcribe).not.toHaveBeenCalled();
  });

  it("writes the chosen model's transcript into the note and records which model wrote it", async () => {
    const { id } = await voiceNote();
    const result = await handlers().transcribe({ id, model: "buzzasr" });

    expect(result).toMatchObject({
      success: true,
      data: { text: "ሰላም ዓለም", content: "<p>ሰላም ዓለም</p>", audio: { transcription: { status: "done", model: "buzzasr" } } },
    });
    expect(buzzasr.transcribe).toHaveBeenCalledOnce();
    expect(hohe.transcribe).not.toHaveBeenCalled();
  });

  it("records an engine failure on the note instead of failing the call", async () => {
    const { id } = await voiceNote();
    engineResult = { success: false, error: "Hohe stopped unexpectedly. Try again." };

    expect(await handlers().transcribe({ id, model: "hohe" })).toMatchObject({
      success: true,
      data: { audio: { transcription: { status: "error", message: "Hohe stopped unexpectedly. Try again." } } },
    });
  });

  it("frees the other models' memory when one is used", async () => {
    await handlers().prepareModel("hohe");

    expect(hohe.prepare).toHaveBeenCalledOnce();
    expect(buzzasr.release).toHaveBeenCalledOnce();
    expect(hohe.release).not.toHaveBeenCalled();
  });

  it("refuses a model that isn't on offer", async () => {
    const { id } = await voiceNote();

    expect(await handlers().transcribe({ id, model: "voicestudio" })).toEqual({
      success: false,
      error: HANDLER_ERRORS.noModel,
    });
    expect(await handlers().prepareModel("voicestudio")).toEqual({ success: false, error: HANDLER_ERRORS.noModel });
  });

  it("transcribes a dictation clip without storing anything", async () => {
    const api = handlers();

    expect(await api.transcribeClip({ audio: new Uint8Array(100), model: "hohe" })).toEqual({
      success: true,
      data: "ሰላም ዓለም",
    });
    expect(await api.listNotes()).toEqual({ success: true, data: [] });
  });

  it("only deletes for good from the Trash", async () => {
    const api = handlers();
    const { id } = await voiceNote();

    expect(await api.deleteNote(id)).toEqual({ success: false, error: HANDLER_ERRORS.state });
    await api.setTrashed({ id, trashed: true });
    expect(await api.deleteNote(id)).toEqual({ success: true, data: { id } });
    expect(await api.transcribe({ id, model: "hohe" })).toEqual({ success: false, error: HANDLER_ERRORS.notFound });
  });

  it("lists every model with its status, in order", async () => {
    buzzasr.status = () => Promise.resolve({ kind: "offline", reason: "BuzzASR isn't set up yet." });

    expect(await handlers().listModels()).toEqual({
      success: true,
      data: [
        { model: "hohe", kind: "online" },
        { model: "buzzasr", kind: "offline", reason: "BuzzASR isn't set up yet." },
      ],
    });
  });

  it("locks a note behind the password, and says so plainly when it's needed", async () => {
    const api = handlers();
    const created = await api.createNote({ content: "<p>ሚስጥር</p>", text: "ሚስጥር" });
    if (!created.success) throw new Error(created.error);
    const { id } = created.data;

    expect(await api.setLocked({ id, locked: true })).toEqual({ success: false, error: HANDLER_ERRORS.locked });
    expect(await api.setLockPassword("123")).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await api.setLockPassword("ጠንካራ-ቃል")).toEqual({ success: true, data: { hasPassword: true, unlocked: true } });
    expect(await api.setLocked({ id, locked: true })).toMatchObject({ success: true, data: { text: "ሚስጥር" } });

    await api.lockNotes();
    expect(await api.openLockedNote(id)).toEqual({ success: false, error: HANDLER_ERRORS.locked });
    expect(await api.unlockNotes("wrong-guess")).toEqual({ success: false, error: HANDLER_ERRORS.wrongPassword });
    expect(await api.unlockNotes("ጠንካራ-ቃል")).toMatchObject({ success: true, data: { unlocked: true } });
    expect(await api.openLockedNote(id)).toMatchObject({ success: true, data: { content: "<p>ሚስጥር</p>" } });
  });

  it("hands a valid export to the save step", async () => {
    const api = handlers();

    expect(await api.exportNote({ title: "ሰላም", format: "md", data: "# ሰላም" })).toEqual({ success: true, data: { saved: true } });
    expect(await api.exportNote({ title: "x", format: "exe" as "md", data: "" })).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(exported).toEqual([{ title: "ሰላም", format: "md", data: "# ሰላም" }]);
  });

  it("starts a known model's setup only, one at a time", async () => {
    const api = handlers();

    expect(await api.startModelSetup("gpt" as "hohe")).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await api.startModelSetup("voicestudio" as "hohe")).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
  });

  it("shows the setup guide on a fresh install until it is completed", async () => {
    const api = handlers();

    expect(await api.getOnboarding()).toEqual({ success: true, data: { show: true } });
    await api.completeOnboarding();
    expect(await api.getOnboarding()).toEqual({ success: true, data: { show: false } });
  });
});

describe("openAudioFile", () => {
  it("returns nothing when the dialog is cancelled", async () => {
    expect(await handlers().openAudioFile()).toEqual({ success: true, data: null });
  });

  it("returns the picked file's name and bytes, for the renderer to decode", async () => {
    pickedFile = path.join(dir, "ቃለ መጠይቅ.m4a");
    await writeFile(pickedFile, new Uint8Array([1, 2, 3]));
    const result = await handlers().openAudioFile();
    expect(result).toEqual({ success: true, data: { name: "ቃለ መጠይቅ.m4a", data: new Uint8Array([1, 2, 3]) } });
  });

  it("says so when the file can't be read, without naming its path", async () => {
    pickedFile = path.join(dir, "gone.mp3");
    const result = await handlers().openAudioFile();
    expect(result).toEqual({ success: false, error: HANDLER_ERRORS.generic });
  });
});

describe("setLocale", () => {
  it("passes a known language on, for the menu bar", async () => {
    expect(await handlers().setLocale({ locale: "am" })).toEqual({ success: true, data: null });
    expect(locales).toEqual(["am"]);
  });

  it("refuses anything else", async () => {
    // @ts-expect-error: what another process might send.
    expect(await handlers().setLocale({ locale: "fr" })).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(locales).toEqual([]);
  });
});
