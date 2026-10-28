import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { NoteVault } from "@main/lib/note-vault";
import { transcriptToHtml, transcriptToText } from "@main/lib/transcript-html";
import { noteSchema } from "@shared/schemas/note";
import type { ModelId } from "@shared/types/engine";
import type { Note, Transcription } from "@shared/types/note";

const NOTE_EXTENSION = ".json";
const AUDIO_EXTENSION = ".wav";
/** A locked note's recording, sealed like its text. */
const SEALED_AUDIO_EXTENSION = ".wav.sealed";
const MAX_LOCKED_TITLE_LENGTH = 200;
const noteFileSchema = z.object({ version: z.literal(1), note: noteSchema });
const bodySchema = z.object({ content: z.string(), text: z.string() });

export class NoteNotFoundError extends Error {
  constructor(id: string) {
    super(`Note ${id} not found`);
    this.name = "NoteNotFoundError";
  }
}

/** A request that doesn't fit the note's state, e.g. deleting a note that isn't in the Trash. */
export class NoteStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoteStateError";
  }
}

interface NoteBody {
  content: string;
  text: string;
}

interface NoteRecording {
  audio: Uint8Array;
  durationMs: number;
}

interface RepoOptions {
  /** Seals locked notes. Without one, locking is refused. */
  vault?: NoteVault;
  now?: () => Date;
}

/** A locked note shows only its title: the first line of its text. */
function titleLine(text: string): string {
  const first = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return (first ?? "").slice(0, MAX_LOCKED_TITLE_LENGTH);
}

/**
 * Notes on disk: one JSON file per note, plus a WAV beside it when the note
 * was spoken. Every operation runs through a single queue, so a transcription
 * finishing while the user types can't interleave two writes to one note.
 *
 * A locked note's file holds only its title; its body (and recording) are
 * sealed by the vault. Replies carry the open body while the notes are
 * unlocked, so the editor always gets the real text.
 */
export class NotesRepo {
  private queue: Promise<void> = Promise.resolve();
  private readonly vault: NoteVault | undefined;
  private readonly now: () => Date;

  constructor(
    private readonly dir: string,
    options: RepoOptions = {},
  ) {
    this.vault = options.vault;
    this.now = options.now ?? (() => new Date());
  }

  /** Every note, most recently edited first, locked ones sealed. Unreadable files are skipped, not fatal. */
  list(): Promise<Note[]> {
    return this.exclusive(async () => {
      const notes = await this.readAll();
      return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }

  create({ content, text }: NoteBody): Promise<Note> {
    return this.exclusive(async () => {
      const note = this.newNote({ content, text, audio: null });
      await this.write(note);
      return note;
    });
  }

  createVoice({ audio, durationMs }: NoteRecording): Promise<Note> {
    return this.exclusive(async () => {
      const note = this.newNote({ content: "", text: "", audio: { durationMs, transcription: { status: "pending" } } });
      await mkdir(this.dir, { recursive: true });
      await writeFile(this.audioPath(note.id), audio);
      await this.write(note);
      return note;
    });
  }

  updateContent(id: string, body: NoteBody): Promise<Note> {
    return this.update(id, (note) => {
      // Saving the same text again is not an edit; the note keeps its place.
      if (!note.lock && note.content === body.content && note.text === body.text) return note;
      return { ...this.withBody(note, body), updatedAt: this.timestamp() };
    });
  }

  setFavorite(id: string, favorite: boolean): Promise<Note> {
    return this.update(id, (note) => ({ ...note, favorite }));
  }

  setPinned(id: string, pinned: boolean): Promise<Note> {
    return this.update(id, (note) => ({ ...note, pinned }));
  }

  setArchived(id: string, archived: boolean): Promise<Note> {
    return this.update(id, (note) => ({ ...note, archivedAt: archived ? this.timestamp() : null }));
  }

  setTrashed(id: string, trashed: boolean): Promise<Note> {
    return this.update(id, (note) => ({ ...note, trashedAt: trashed ? this.timestamp() : null }));
  }

  /** Seals a note (and its recording) with the vault's key, or opens it for good. */
  setLocked(id: string, locked: boolean): Promise<Note> {
    return this.exclusive(async () => {
      const note = await this.find(id);
      if (Boolean(note.lock) === locked) return this.view(note);
      const vault = this.requireVault();
      const body = locked ? { content: note.content, text: note.text } : this.openBody(note);
      const [from, to] = locked
        ? [this.audioPath(id), this.sealedAudioPath(id)]
        : [this.sealedAudioPath(id), this.audioPath(id)];
      if (note.audio) {
        const audio = await readFile(from);
        await writeFile(to, locked ? vault.seal(audio) : vault.open(audio));
      }
      const updated = locked
        ? this.withBody({ ...note, lock: { body: "" } }, body)
        : { ...note, ...body, lock: null };
      await this.write(updated);
      if (note.audio) await rm(from, { force: true });
      return this.view(updated);
    });
  }

  /** A locked note with its body opened, for the editor. Needs the vault unlocked. */
  openLocked(id: string): Promise<Note> {
    return this.exclusive(async () => {
      const note = await this.find(id);
      return note.lock ? { ...note, ...this.openBody(note) } : note;
    });
  }

  /** Keeps the audio of a dictation with its note. A note holds one recording. */
  attachAudio(id: string, recording: NoteRecording, transcribedBy?: ModelId): Promise<Note> {
    return this.exclusive(async () => {
      const note = await this.find(id);
      if (note.audio) throw new NoteStateError("The note already has a recording.");
      const transcription: Transcription = transcribedBy
        ? { status: "done", transcribedAt: this.timestamp(), model: transcribedBy }
        : { status: "pending" };
      if (note.lock) await writeFile(this.sealedAudioPath(id), this.requireVault().seal(Buffer.from(recording.audio)));
      else await writeFile(this.audioPath(id), recording.audio);
      const updated: Note = { ...note, audio: { durationMs: recording.durationMs, transcription } };
      await this.write(updated);
      return this.view(updated);
    });
  }

  readAudio(id: string): Promise<Uint8Array> {
    return this.exclusive(async () => {
      const note = await this.find(id);
      if (!note.audio) throw new NoteStateError("The note has no recording.");
      if (!note.lock) return readFile(this.audioPath(id));
      return this.requireVault().open(await readFile(this.sealedAudioPath(id)));
    });
  }

  /** Records what the engine did; a successful run also replaces the note's text with the transcript. */
  setTranscription(id: string, transcription: Transcription, transcript?: string): Promise<Note> {
    return this.update(id, (note) => {
      if (!note.audio) throw new NoteStateError("The note has no recording.");
      const withAudio = { ...note, audio: { ...note.audio, transcription } };
      if (transcript === undefined) return withAudio;
      const body = { content: transcriptToHtml(transcript), text: transcriptToText(transcript) };
      return { ...this.withBody(withAudio, body), updatedAt: this.timestamp() };
    });
  }

  /** Deletes a note for good. Only notes already in the Trash can go. */
  remove(id: string): Promise<void> {
    return this.exclusive(async () => {
      const note = await this.find(id);
      if (!note.trashedAt) throw new NoteStateError("Only notes in the Trash can be deleted.");
      await this.erase(id);
    });
  }

  emptyTrash(): Promise<string[]> {
    return this.exclusive(async () => {
      const trashed = (await this.readAll()).filter((note) => note.trashedAt !== null).map((note) => note.id);
      for (const id of trashed) await this.erase(id);
      return trashed;
    });
  }

  /** Adds a note made elsewhere (an older version's recording), unless it is already here. */
  importNote(note: Note, audioFile: string | null): Promise<boolean> {
    return this.exclusive(async () => {
      if (await this.readNoteFile(this.notePath(note.id))) return false;
      await mkdir(this.dir, { recursive: true });
      if (audioFile) await copyFile(audioFile, this.audioPath(note.id));
      await this.write(note);
      return true;
    });
  }

  private newNote(fields: Pick<Note, "content" | "text" | "audio">): Note {
    const now = this.timestamp();
    return {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      favorite: false,
      pinned: false,
      archivedAt: null,
      trashedAt: null,
      lock: null,
      ...fields,
    };
  }

  /** The note with a new body: stored as is, or sealed with only the title left showing. */
  private withBody(note: Note, body: NoteBody): Note {
    if (!note.lock) return { ...note, ...body };
    const sealed = this.requireVault().seal(Buffer.from(JSON.stringify(body), "utf8"));
    return { ...note, content: "", text: titleLine(body.text), lock: { body: sealed.toString("base64") } };
  }

  private openBody(note: Note): NoteBody {
    if (!note.lock) return { content: note.content, text: note.text };
    const plain = this.requireVault().open(Buffer.from(note.lock.body, "base64"));
    return bodySchema.parse(JSON.parse(plain.toString("utf8")));
  }

  /** What a reply carries: a locked note's open body while the vault is unlocked. */
  private view(note: Note): Note {
    return note.lock && this.vault?.isUnlocked() ? { ...note, ...this.openBody(note) } : note;
  }

  private requireVault(): NoteVault {
    if (!this.vault) throw new NoteStateError("Locking isn't available.");
    return this.vault;
  }

  private update(id: string, change: (note: Note) => Note): Promise<Note> {
    return this.exclusive(async () => {
      const updated = change(await this.find(id));
      await this.write(updated);
      return this.view(updated);
    });
  }

  private async find(id: string): Promise<Note> {
    const note = await this.readNoteFile(this.notePath(id));
    if (!note) throw new NoteNotFoundError(id);
    return note;
  }

  private async readAll(): Promise<Note[]> {
    const files = await this.noteFiles();
    const notes = await Promise.all(files.map((file) => this.readNoteFile(path.join(this.dir, file))));
    return notes.filter((note): note is Note => note !== null);
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private notePath(id: string): string {
    return path.join(this.dir, `${id}${NOTE_EXTENSION}`);
  }

  private audioPath(id: string): string {
    return path.join(this.dir, `${id}${AUDIO_EXTENSION}`);
  }

  private sealedAudioPath(id: string): string {
    return path.join(this.dir, `${id}${SEALED_AUDIO_EXTENSION}`);
  }

  private async noteFiles(): Promise<string[]> {
    try {
      return (await readdir(this.dir)).filter((file) => file.endsWith(NOTE_EXTENSION));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async readNoteFile(file: string): Promise<Note | null> {
    let raw: string;
    try {
      raw = await readFile(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    try {
      return noteFileSchema.parse(JSON.parse(raw)).note;
    } catch {
      console.error(`[notes] skipped an unreadable note file: ${path.basename(file)}`);
      return null;
    }
  }

  /** Write-then-rename so a crash mid-write never leaves a torn note. */
  private async write(note: Note): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const target = this.notePath(note.id);
    const temp = `${target}.tmp`;
    await writeFile(temp, JSON.stringify({ version: 1, note }, null, 2), "utf8");
    await rename(temp, target);
  }

  private async erase(id: string): Promise<void> {
    await rm(this.notePath(id), { force: true });
    await rm(this.audioPath(id), { force: true });
    await rm(this.sealedAudioPath(id), { force: true });
  }

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
