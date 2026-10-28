import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoteNotFoundError, NotesRepo, NoteStateError } from "@main/lib/notes-repo";

let dir: string;
let repo: NotesRepo;
let clock: number;
const audio = new Uint8Array([1, 2, 3, 4]);

/** Each call is a minute after the last, so ordering by time is deterministic. */
function tick(): Date {
  clock += 60_000;
  return new Date(clock);
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "nota-repo-"));
  clock = Date.parse("2026-10-28T09:00:00.000Z");
  repo = new NotesRepo(dir, tick);
});

afterEach(() => rm(dir, { recursive: true, force: true }));

describe("NotesRepo", () => {
  it("starts empty", async () => {
    expect(await repo.list()).toEqual([]);
  });

  it("keeps a typed note across restarts", async () => {
    const note = await repo.create({ content: "<p>ሰላም #ስራ</p>", text: "ሰላም #ስራ" });

    expect(note).toMatchObject({ content: "<p>ሰላም #ስራ</p>", favorite: false, trashedAt: null, audio: null });
    expect(await new NotesRepo(dir).list()).toEqual([note]);
  });

  it("lists the most recently edited first", async () => {
    const older = await repo.create({ content: "", text: "older" });
    const newer = await repo.create({ content: "", text: "newer" });
    await repo.updateContent(older.id, { content: "<p>edited</p>", text: "edited" });

    expect((await repo.list()).map((note) => note.id)).toEqual([older.id, newer.id]);
  });

  it("saves a voice note's audio and waits to transcribe it", async () => {
    const note = await repo.createVoice({ audio, durationMs: 1500 });

    expect(note.audio).toEqual({ durationMs: 1500, transcription: { status: "pending" } });
    expect(Array.from(await repo.readAudio(note.id))).toEqual([1, 2, 3, 4]);
  });

  it("replaces the text with a transcript, and keeps it when transcription fails", async () => {
    const { id } = await repo.createVoice({ audio, durationMs: 1500 });
    const done = await repo.setTranscription(
      id,
      { status: "done", transcribedAt: "2026-10-28T09:05:00.000Z", model: "hohe" },
      "ሰላም <ዓለም>\nሁለተኛ",
    );
    expect(done).toMatchObject({ content: "<p>ሰላም &lt;ዓለም&gt;</p><p>ሁለተኛ</p>", text: "ሰላም <ዓለም>\nሁለተኛ" });

    const failed = await repo.setTranscription(id, { status: "error", message: "Hohe stopped." });
    expect(failed.text).toBe(done.text);
    expect(failed.audio?.transcription).toEqual({ status: "error", message: "Hohe stopped." });
  });

  it("favourites and trashes without counting as an edit", async () => {
    const note = await repo.create({ content: "", text: "x" });
    const favorite = await repo.setFavorite(note.id, true);
    const trashed = await repo.setTrashed(note.id, true);

    expect(favorite.favorite).toBe(true);
    expect(trashed.trashedAt).not.toBeNull();
    expect(trashed.updatedAt).toBe(note.updatedAt);
    expect((await repo.setTrashed(note.id, false)).trashedAt).toBeNull();
  });

  it("only deletes notes in the Trash, and takes their audio with them", async () => {
    const { id } = await repo.createVoice({ audio, durationMs: 1000 });

    await expect(repo.remove(id)).rejects.toBeInstanceOf(NoteStateError);
    await repo.setTrashed(id, true);
    await repo.remove(id);

    expect(await readdir(dir)).toEqual([]);
    await expect(repo.readAudio(id)).rejects.toBeInstanceOf(NoteNotFoundError);
  });

  it("empties the Trash and nothing else", async () => {
    const kept = await repo.create({ content: "", text: "kept" });
    const binned = await repo.create({ content: "", text: "binned" });
    await repo.setTrashed(binned.id, true);

    expect(await repo.emptyTrash()).toEqual([binned.id]);
    expect((await repo.list()).map((note) => note.id)).toEqual([kept.id]);
  });

  it("attaches a dictation's audio once", async () => {
    const note = await repo.create({ content: "<p>ሰላም</p>", text: "ሰላም" });
    const attached = await repo.attachAudio(note.id, { audio, durationMs: 900 }, "hohe");

    expect(attached.audio).toMatchObject({ durationMs: 900, transcription: { status: "done", model: "hohe" } });
    expect(attached.text).toBe("ሰላም");
    await expect(repo.attachAudio(note.id, { audio, durationMs: 900 })).rejects.toBeInstanceOf(NoteStateError);
  });

  it("skips a damaged note file instead of failing the whole list", async () => {
    const note = await repo.create({ content: "", text: "fine" });
    await writeFile(path.join(dir, "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e.json"), "{ not json");

    expect(await repo.list()).toEqual([note]);
  });

  it("serializes concurrent writes to one note", async () => {
    const { id } = await repo.create({ content: "", text: "" });
    await Promise.all([
      repo.updateContent(id, { content: "<p>a</p>", text: "a" }),
      repo.setFavorite(id, true),
      repo.updateContent(id, { content: "<p>b</p>", text: "b" }),
    ]);

    expect((await repo.list())[0]).toMatchObject({ text: "b", favorite: true });
  });
});
