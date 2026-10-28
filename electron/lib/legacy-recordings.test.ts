import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importLegacyRecordings } from "@main/lib/legacy-recordings";
import { NotesRepo } from "@main/lib/notes-repo";

let root: string;
let recordingsDir: string;
let repo: NotesRepo;

const transcribedId = "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e";
const pendingId = "9a1d2c3b-4e5f-4a6b-8c7d-0e1f2a3b4c5d";

async function writeLegacy(): Promise<void> {
  await mkdir(recordingsDir, { recursive: true });
  await writeFile(
    path.join(recordingsDir, "recordings.json"),
    JSON.stringify({
      version: 1,
      recordings: [
        {
          id: transcribedId,
          createdAt: "2026-10-27T19:32:00.000Z",
          durationMs: 19_000,
          transcript: "ሙከራ ሙከራ አንድ ሁለት ሶስት",
          transcription: { status: "done", transcribedAt: "2026-10-27T19:33:00.000Z", model: "hohe" },
        },
        {
          id: pendingId,
          createdAt: "2026-10-26T08:00:00.000Z",
          durationMs: 3000,
          transcript: "",
          transcription: { status: "pending" },
        },
      ],
    }),
  );
  await writeFile(path.join(recordingsDir, `${transcribedId}.wav`), new Uint8Array([1, 2, 3]));
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "nota-legacy-"));
  recordingsDir = path.join(root, "recordings");
  repo = new NotesRepo(path.join(root, "notes"));
});

afterEach(() => rm(root, { recursive: true, force: true }));

describe("importLegacyRecordings", () => {
  it("turns each recording into a note, keeping its text, time and audio", async () => {
    await writeLegacy();

    expect(await importLegacyRecordings(recordingsDir, repo)).toBe(2);
    const notes = await repo.list();
    expect(notes).toEqual([
      expect.objectContaining({
        id: transcribedId,
        createdAt: "2026-10-27T19:32:00.000Z",
        updatedAt: "2026-10-27T19:33:00.000Z",
        content: "<p>ሙከራ ሙከራ አንድ ሁለት ሶስት</p>",
        text: "ሙከራ ሙከራ አንድ ሁለት ሶስት",
        audio: { durationMs: 19_000, transcription: expect.objectContaining({ status: "done", model: "hohe" }) },
      }),
      // Its WAV was missing, so it becomes a note without a recording.
      expect.objectContaining({ id: pendingId, text: "", audio: null }),
    ]);
    expect(Array.from(await repo.readAudio(transcribedId))).toEqual([1, 2, 3]);
  });

  it("leaves the old recordings in place", async () => {
    await writeLegacy();
    await importLegacyRecordings(recordingsDir, repo);

    expect(await readdir(recordingsDir)).toEqual(
      expect.arrayContaining(["recordings.json", `${transcribedId}.wav`]),
    );
  });

  it("imports once, so a note deleted later doesn't come back", async () => {
    await writeLegacy();
    await importLegacyRecordings(recordingsDir, repo);
    await repo.setTrashed(transcribedId, true);
    await repo.remove(transcribedId);

    expect(await importLegacyRecordings(recordingsDir, repo)).toBe(0);
    expect((await repo.list()).map((note) => note.id)).toEqual([pendingId]);
  });

  it("does nothing when there were never any recordings", async () => {
    expect(await importLegacyRecordings(recordingsDir, repo)).toBe(0);
    expect(await repo.list()).toEqual([]);
  });
});
