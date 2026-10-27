import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RecordingNotFoundError, RecordingsRepo } from "@main/lib/recordings-repo";

let dir: string;
let repo: RecordingsRepo;
const audio = new Uint8Array([1, 2, 3, 4]);

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "stt-repo-"));
  repo = new RecordingsRepo(dir);
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("RecordingsRepo", () => {
  it("starts empty when nothing has been recorded", async () => {
    expect(await repo.list()).toEqual([]);
  });

  it("stores the audio and a pending recording", async () => {
    const created = await repo.create({ audio, durationMs: 1500 });
    expect(created).toMatchObject({ durationMs: 1500, transcript: "", transcription: { status: "pending" } });
    expect(Array.from(await repo.readAudio(created.id))).toEqual([1, 2, 3, 4]);
    expect(await new RecordingsRepo(dir).list()).toEqual([created]);
  });

  it("lists newest first", async () => {
    const first = await repo.create({ audio, durationMs: 1000 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await repo.create({ audio, durationMs: 1000 });
    expect((await repo.list()).map((recording) => recording.id)).toEqual([second.id, first.id]);
  });

  it("keeps the transcript when a transcription fails, replaces it when one succeeds", async () => {
    const { id } = await repo.create({ audio, durationMs: 1000 });
    await repo.updateTranscript(id, "typed by hand");

    const failed = await repo.setTranscription(id, { status: "error", message: "offline" });
    expect(failed.transcript).toBe("typed by hand");

    const done = await repo.setTranscription(id, { status: "done", transcribedAt: new Date().toISOString() }, "ሰላም");
    expect(done.transcript).toBe("ሰላም");
  });

  it("does not lose writes that race each other", async () => {
    const a = await repo.create({ audio, durationMs: 1000 });
    const b = await repo.create({ audio, durationMs: 1000 });
    await Promise.all([repo.updateTranscript(a.id, "a"), repo.updateTranscript(b.id, "b")]);
    const byId = Object.fromEntries((await repo.list()).map((recording) => [recording.id, recording.transcript]));
    expect(byId).toEqual({ [a.id]: "a", [b.id]: "b" });
  });

  it("removes the audio file with the recording", async () => {
    const { id } = await repo.create({ audio, durationMs: 1000 });
    await repo.remove(id);
    expect(await repo.list()).toEqual([]);
    expect(await readdir(dir)).toEqual(["recordings.json"]);
  });

  it("refuses ids it does not know", async () => {
    await expect(repo.readAudio("4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e")).rejects.toBeInstanceOf(RecordingNotFoundError);
  });
});
