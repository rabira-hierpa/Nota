import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDesktopHandlers, HANDLER_ERRORS } from "@main/ipc/desktop-handlers";
import type { Engines } from "@main/ipc/desktop-handlers";
import { RecordingsRepo } from "@main/lib/recordings-repo";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import type { ModelId } from "@shared/types/engine";
import type { CreateRecordingInput } from "@shared/types/recording";
import type { Result } from "@shared/types/result";

let dir: string;
let repo: RecordingsRepo;
let engineResult: Result<string>;

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

const validInput = { audio: new Uint8Array(100), durationMs: 2000 };

async function created(input: CreateRecordingInput = validInput) {
  const result = await createDesktopHandlers(repo, engines).createRecording(input);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "stt-ipc-"));
  repo = new RecordingsRepo(dir);
  hohe = fakeEngine();
  buzzasr = fakeEngine();
  engines = new Map<ModelId, TranscriptionEngine>([
    ["hohe", hohe],
    ["buzzasr", buzzasr],
  ]);
  engineResult = { success: true, data: "ሰላም ዓለም" };
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("createDesktopHandlers", () => {
  it("rejects payloads that do not match the contract", async () => {
    const handlers = createDesktopHandlers(repo, engines);
    const tooShort = { audio: new Uint8Array(10), durationMs: 2000 };
    const extraField = { ...validInput, path: "/etc/passwd" } as CreateRecordingInput;
    const longClip = { audio: new Uint8Array(3 * 1024 * 1024), model: "hohe" as const };
    const unknownModel = { id: "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e", model: "gpt" as ModelId };

    expect(await handlers.createRecording(tooShort)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await handlers.createRecording(extraField)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await handlers.readAudio("../../etc/passwd")).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await handlers.transcribeClip(longClip)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await handlers.transcribe(unknownModel)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(hohe.transcribe).not.toHaveBeenCalled();
  });

  it("stores the chosen model's Amharic text and which model wrote it", async () => {
    const { id } = await created();
    const result = await createDesktopHandlers(repo, engines).transcribe({ id, model: "buzzasr" });

    expect(result).toMatchObject({
      success: true,
      data: { transcript: "ሰላም ዓለም", transcription: { status: "done", model: "buzzasr" } },
    });
    expect(buzzasr.transcribe).toHaveBeenCalledOnce();
    expect(hohe.transcribe).not.toHaveBeenCalled();
  });

  it("frees the other models' memory when one is used", async () => {
    const handlers = createDesktopHandlers(repo, engines);
    await handlers.prepareModel("hohe");

    expect(hohe.prepare).toHaveBeenCalledOnce();
    expect(buzzasr.release).toHaveBeenCalledOnce();
    expect(hohe.release).not.toHaveBeenCalled();
  });

  it("refuses a model that isn't on offer", async () => {
    const handlers = createDesktopHandlers(repo, engines);
    const { id } = await created();

    expect(await handlers.transcribe({ id, model: "voicestudio" })).toEqual({
      success: false,
      error: HANDLER_ERRORS.noModel,
    });
    expect(await handlers.prepareModel("voicestudio")).toEqual({ success: false, error: HANDLER_ERRORS.noModel });
  });

  it("records an engine failure on the recording instead of failing the call", async () => {
    const { id } = await created();
    engineResult = { success: false, error: "Hohe stopped unexpectedly. Try again." };
    const result = await createDesktopHandlers(repo, engines).transcribe({ id, model: "hohe" });

    expect(result).toMatchObject({
      success: true,
      data: { transcription: { status: "error", message: "Hohe stopped unexpectedly. Try again." } },
    });
  });

  it("transcribes a dictation clip without storing anything", async () => {
    const handlers = createDesktopHandlers(repo, engines);
    const result = await handlers.transcribeClip({ audio: new Uint8Array(100), model: "hohe" });

    expect(result).toEqual({ success: true, data: "ሰላም ዓለም" });
    expect(await handlers.listRecordings()).toEqual({ success: true, data: [] });
  });

  it("saves a dictated recording as already transcribed", async () => {
    const recording = await created({ ...validInput, dictated: { transcript: "ሰላም", model: "hohe" } });

    expect(recording).toMatchObject({ transcript: "ሰላም", transcription: { status: "done", model: "hohe" } });
  });

  it("lists every model with its status, in order", async () => {
    buzzasr.status = () => Promise.resolve({ kind: "offline", reason: "BuzzASR isn't set up yet." });

    expect(await createDesktopHandlers(repo, engines).listModels()).toEqual({
      success: true,
      data: [
        { model: "hohe", kind: "online" },
        { model: "buzzasr", kind: "offline", reason: "BuzzASR isn't set up yet." },
      ],
    });
  });

  it("reports a deleted recording as not found", async () => {
    const handlers = createDesktopHandlers(repo, engines);
    const { id } = await created();
    await handlers.deleteRecording(id);

    expect(await handlers.transcribe({ id, model: "hohe" })).toEqual({
      success: false,
      error: HANDLER_ERRORS.notFound,
    });
  });
});
