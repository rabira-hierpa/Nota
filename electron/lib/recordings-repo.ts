import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { recordingSchema } from "@shared/schemas/recording";
import type { CreateRecordingInput, Recording, Transcription } from "@shared/types/recording";

const INDEX_FILE = "recordings.json";
const indexSchema = z.object({ version: z.literal(1), recordings: z.array(recordingSchema) });

export class RecordingNotFoundError extends Error {
  constructor(id: string) {
    super(`Recording ${id} not found`);
    this.name = "RecordingNotFoundError";
  }
}

/**
 * Recordings on disk: one WAV per recording plus a JSON index. Every
 * operation runs through a single queue so a transcription finishing while
 * the user edits can't interleave two index writes.
 */
export class RecordingsRepo {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly dir: string) {}

  list(): Promise<Recording[]> {
    return this.exclusive(async () => {
      const recordings = await this.readIndex();
      return [...recordings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  create(input: CreateRecordingInput): Promise<Recording> {
    return this.exclusive(async () => {
      const recording: Recording = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        durationMs: input.durationMs,
        transcript: "",
        transcription: { status: "pending" },
      };
      await mkdir(this.dir, { recursive: true });
      await writeFile(this.audioPath(recording.id), input.audio);
      await this.writeIndex([...(await this.readIndex()), recording]);
      return recording;
    });
  }

  readAudio(id: string): Promise<Uint8Array> {
    return this.exclusive(async () => {
      await this.find(id);
      return readFile(this.audioPath(id));
    });
  }

  updateTranscript(id: string, transcript: string): Promise<Recording> {
    return this.update(id, (recording) => ({ ...recording, transcript }));
  }

  /** Records what the engine did; a successful run also replaces the text. */
  setTranscription(id: string, transcription: Transcription, transcript?: string): Promise<Recording> {
    return this.update(id, (recording) => ({
      ...recording,
      transcription,
      transcript: transcript ?? recording.transcript,
    }));
  }

  remove(id: string): Promise<void> {
    return this.exclusive(async () => {
      const recordings = await this.readIndex();
      await this.find(id, recordings);
      await this.writeIndex(recordings.filter((recording) => recording.id !== id));
      await rm(this.audioPath(id), { force: true });
    });
  }

  private update(id: string, change: (recording: Recording) => Recording): Promise<Recording> {
    return this.exclusive(async () => {
      const recordings = await this.readIndex();
      const updated = change(await this.find(id, recordings));
      await this.writeIndex(recordings.map((recording) => (recording.id === id ? updated : recording)));
      return updated;
    });
  }

  private async find(id: string, recordings?: Recording[]): Promise<Recording> {
    const all = recordings ?? (await this.readIndex());
    const recording = all.find((candidate) => candidate.id === id);
    if (!recording) throw new RecordingNotFoundError(id);
    return recording;
  }

  private audioPath(id: string): string {
    return path.join(this.dir, `${id}.wav`);
  }

  private async readIndex(): Promise<Recording[]> {
    let raw: string;
    try {
      raw = await readFile(path.join(this.dir, INDEX_FILE), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    return indexSchema.parse(JSON.parse(raw)).recordings;
  }

  /** Write-then-rename so a crash mid-write never leaves a torn index. */
  private async writeIndex(recordings: Recording[]): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const target = path.join(this.dir, INDEX_FILE);
    const temp = `${target}.tmp`;
    await writeFile(temp, JSON.stringify({ version: 1, recordings }, null, 2), "utf8");
    await rename(temp, target);
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
