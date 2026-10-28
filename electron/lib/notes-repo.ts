import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { transcriptToHtml, transcriptToText } from "@main/lib/transcript-html";
import { noteSchema } from "@shared/schemas/note";
import type { ModelId } from "@shared/types/engine";
import type { Note, Transcription } from "@shared/types/note";

const NOTE_EXTENSION = ".json";
const AUDIO_EXTENSION = ".wav";
const noteFileSchema = z.object({ version: z.literal(1), note: noteSchema });

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

interface NoteContent {
  content: string;
  text: string;
}

interface NoteRecording {
  audio: Uint8Array;
  durationMs: number;
}

/**
 * Notes on disk: one JSON file per note, plus a WAV beside it when the note
 * was spoken. Every operation runs through a single queue, so a transcription
 * finishing while the user types can't interleave two writes to one note.
 */
export class NotesRepo {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly dir: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Every note, most recently edited first. Unreadable files are skipped, not fatal. */
  list(): Promise<Note[]> {
    return this.exclusive(async () => {
      const files = await this.noteFiles();
      const notes = await Promise.all(files.map((file) => this.readNoteFile(path.join(this.dir, file))));
      return notes
        .filter((note): note is Note => note !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }

  create({ content, text }: NoteContent): Promise<Note> {
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

  updateContent(id: string, { content, text }: NoteContent): Promise<Note> {
    return this.update(id, (note) => ({ ...note, content, text, updatedAt: this.timestamp() }));
  }

  setFavorite(id: string, favorite: boolean): Promise<Note> {
    return this.update(id, (note) => ({ ...note, favorite }));
  }

  setTrashed(id: string, trashed: boolean): Promise<Note> {
    return this.update(id, (note) => ({ ...note, trashedAt: trashed ? this.timestamp() : null }));
  }

  /** Keeps the audio of a dictation with its note. A note holds one recording. */
  attachAudio(id: string, recording: NoteRecording, transcribedBy?: ModelId): Promise<Note> {
    return this.exclusive(async () => {
      const note = await this.find(id);
      if (note.audio) throw new NoteStateError("The note already has a recording.");
      const transcription: Transcription = transcribedBy
        ? { status: "done", transcribedAt: this.timestamp(), model: transcribedBy }
        : { status: "pending" };
      await writeFile(this.audioPath(id), recording.audio);
      const updated: Note = { ...note, audio: { durationMs: recording.durationMs, transcription } };
      await this.write(updated);
      return updated;
    });
  }

  readAudio(id: string): Promise<Uint8Array> {
    return this.exclusive(async () => {
      const note = await this.find(id);
      if (!note.audio) throw new NoteStateError("The note has no recording.");
      return readFile(this.audioPath(id));
    });
  }

  /** Records what the engine did; a successful run also replaces the note's text with the transcript. */
  setTranscription(id: string, transcription: Transcription, transcript?: string): Promise<Note> {
    return this.update(id, (note) => {
      if (!note.audio) throw new NoteStateError("The note has no recording.");
      const audio = { ...note.audio, transcription };
      if (transcript === undefined) return { ...note, audio };
      return {
        ...note,
        audio,
        content: transcriptToHtml(transcript),
        text: transcriptToText(transcript),
        updatedAt: this.timestamp(),
      };
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
      const files = await this.noteFiles();
      const notes = await Promise.all(files.map((file) => this.readNoteFile(path.join(this.dir, file))));
      const trashed = notes.filter((note): note is Note => note?.trashedAt != null).map((note) => note.id);
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
    return { id: randomUUID(), createdAt: now, updatedAt: now, favorite: false, trashedAt: null, ...fields };
  }

  private update(id: string, change: (note: Note) => Note): Promise<Note> {
    return this.exclusive(async () => {
      const updated = change(await this.find(id));
      await this.write(updated);
      return updated;
    });
  }

  private async find(id: string): Promise<Note> {
    const note = await this.readNoteFile(this.notePath(id));
    if (!note) throw new NoteNotFoundError(id);
    return note;
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
