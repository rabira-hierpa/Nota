import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoteVault, VaultLockedError } from "@main/lib/note-vault";
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
  repo = new NotesRepo(dir, { now: tick });
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

  it("doesn't count saving the same text as an edit", async () => {
    const note = await repo.create({ content: "<p>ሰላም</p>", text: "ሰላም" });

    expect(await repo.updateContent(note.id, { content: "<p>ሰላም</p>", text: "ሰላም" })).toEqual(note);
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

  it("reads note files from before pinning, archiving and locking existed", async () => {
    const id = "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e";
    const old = { id, createdAt: "2026-10-01T09:00:00.000Z", updatedAt: "2026-10-01T09:00:00.000Z", content: "", text: "old", favorite: false, trashedAt: null, audio: null };
    await writeFile(path.join(dir, `${id}.json`), JSON.stringify({ version: 1, note: old }));

    expect(await repo.list()).toEqual([{ ...old, pinned: false, archivedAt: null, lock: null }]);
  });

  it("pins and archives without counting as an edit", async () => {
    const note = await repo.create({ content: "", text: "x" });

    expect(await repo.setPinned(note.id, true)).toMatchObject({ pinned: true, updatedAt: note.updatedAt });
    expect((await repo.setArchived(note.id, true)).archivedAt).not.toBeNull();
    expect((await repo.setArchived(note.id, false)).archivedAt).toBeNull();
  });
});

describe("NotesRepo with locked notes", () => {
  let vault: NoteVault;
  const secret = "የይለፍ ቃሉ ሚስጥር ነው";

  beforeEach(async () => {
    vault = new NoteVault(path.join(dir, "vault.json"));
    repo = new NotesRepo(path.join(dir, "notes"), { vault, now: tick });
    await vault.setPassword("ጠንካራ-password");
  });

  async function rawFile(id: string): Promise<string> {
    return readFile(path.join(dir, "notes", `${id}.json`), "utf8");
  }

  it("keeps only the title readable on disk, and the body for whoever has the password", async () => {
    const note = await repo.create({ content: `<h1>ሚስጥር</h1><p>${secret}</p>`, text: `ሚስጥር\n${secret}` });
    const locked = await repo.setLocked(note.id, true);

    // The reply carries the open body, so the editor keeps showing it.
    expect(locked).toMatchObject({ text: `ሚስጥር\n${secret}`, lock: expect.any(Object) });
    const onDisk = await rawFile(note.id);
    expect(onDisk).not.toContain(secret);
    expect((await repo.list())[0]).toMatchObject({ content: "", text: "ሚስጥር" });

    vault.lock();
    await expect(repo.openLocked(note.id)).rejects.toBeInstanceOf(VaultLockedError);
    await vault.unlock("ጠንካራ-password");
    expect((await repo.openLocked(note.id)).content).toContain(secret);
  });

  it("seals edits to a locked note and refuses them while locked", async () => {
    const note = await repo.create({ content: "<p>title</p>", text: "title" });
    await repo.setLocked(note.id, true);
    await repo.updateContent(note.id, { content: `<p>title</p><p>${secret}</p>`, text: `title\n${secret}` });

    expect(await rawFile(note.id)).not.toContain(secret);
    vault.lock();
    await expect(repo.updateContent(note.id, { content: "", text: "" })).rejects.toBeInstanceOf(VaultLockedError);
  });

  it("seals a locked note's recording too, and opens it for playback", async () => {
    const note = await repo.createVoice({ audio, durationMs: 1000 });
    await repo.setLocked(note.id, true);

    expect(await readdir(path.join(dir, "notes"))).toEqual([`${note.id}.json`, `${note.id}.wav.sealed`]);
    expect(Array.from(await repo.readAudio(note.id))).toEqual([1, 2, 3, 4]);
    vault.lock();
    await expect(repo.readAudio(note.id)).rejects.toBeInstanceOf(VaultLockedError);
  });

  it("removes the lock for good, putting the text and audio back", async () => {
    const note = await repo.createVoice({ audio, durationMs: 1000 });
    await repo.setTranscription(note.id, { status: "done", transcribedAt: "2026-10-28T09:05:00.000Z" }, secret);
    await repo.setLocked(note.id, true);
    const opened = await repo.setLocked(note.id, false);

    expect(opened).toMatchObject({ text: secret, lock: null });
    expect(await rawFile(note.id)).toContain(secret);
    expect(await readdir(path.join(dir, "notes"))).toEqual([`${note.id}.json`, `${note.id}.wav`]);
  });

  it("can't lock a note while the notes are locked", async () => {
    const note = await repo.create({ content: "", text: "x" });
    vault.lock();
    await expect(repo.setLocked(note.id, true)).rejects.toBeInstanceOf(VaultLockedError);
  });
});
