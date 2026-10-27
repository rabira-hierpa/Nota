import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDesktopHandlers, HANDLER_ERRORS } from "@main/ipc/desktop-handlers";
import { RecordingsRepo } from "@main/lib/recordings-repo";
import type { TranscriptionEngine } from "@main/lib/voice-studio";
import type { CreateRecordingInput } from "@shared/types/recording";
import type { Result } from "@shared/types/result";

let dir: string;
let repo: RecordingsRepo;
let engineResult: Result<string>;

const engine: TranscriptionEngine = {
  status: () => Promise.resolve({ kind: "online", url: "http://127.0.0.1:3900" }),
  transcribe: () => Promise.resolve(engineResult),
};

const validInput = { audio: new Uint8Array(100), durationMs: 2000 };

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "stt-ipc-"));
  repo = new RecordingsRepo(dir);
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("createDesktopHandlers", () => {
  it("rejects payloads that do not match the contract", async () => {
    const handlers = createDesktopHandlers(repo, engine);
    const tooShort = { audio: new Uint8Array(10), durationMs: 2000 };
    const extraField = { ...validInput, path: "/etc/passwd" } as CreateRecordingInput;

    expect(await handlers.createRecording(tooShort)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await handlers.createRecording(extraField)).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
    expect(await handlers.readAudio("../../etc/passwd")).toEqual({ success: false, error: HANDLER_ERRORS.invalid });
  });

  it("stores the engine's Amharic text when transcription succeeds", async () => {
    const handlers = createDesktopHandlers(repo, engine);
    const created = await handlers.createRecording(validInput);
    if (!created.success) throw new Error(created.error);

    engineResult = { success: true, data: "ሰላም ዓለም" };
    const result = await handlers.transcribe(created.data.id);

    expect(result.success && result.data.transcript).toBe("ሰላም ዓለም");
    expect(result.success && result.data.transcription.status).toBe("done");
  });

  it("records an engine failure on the recording instead of failing the call", async () => {
    const handlers = createDesktopHandlers(repo, engine);
    const created = await handlers.createRecording(validInput);
    if (!created.success) throw new Error(created.error);

    engineResult = { success: false, error: "VoiceStudio isn't running." };
    const result = await handlers.transcribe(created.data.id);

    expect(result).toMatchObject({
      success: true,
      data: { transcription: { status: "error", message: "VoiceStudio isn't running." } },
    });
  });

  it("reports a deleted recording as not found", async () => {
    const handlers = createDesktopHandlers(repo, engine);
    const created = await handlers.createRecording(validInput);
    if (!created.success) throw new Error(created.error);
    await handlers.deleteRecording(created.data.id);

    expect(await handlers.transcribe(created.data.id)).toEqual({ success: false, error: HANDLER_ERRORS.notFound });
  });
});
