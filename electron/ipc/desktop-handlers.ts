import { RecordingNotFoundError } from "@main/lib/recordings-repo";
import type { RecordingsRepo } from "@main/lib/recordings-repo";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import { modelIdSchema } from "@shared/schemas/engine";
import {
  createRecordingInputSchema,
  recordingIdSchema,
  transcribeClipInputSchema,
  transcribeInputSchema,
  updateTranscriptInputSchema,
} from "@shared/schemas/recording";
import type { DesktopApi } from "@shared/types/desktop-api";
import type { ModelId } from "@shared/types/engine";
import type { Recording, TranscribeInput } from "@shared/types/recording";
import type { Result } from "@shared/types/result";

export const HANDLER_ERRORS = {
  invalid: "That request wasn't valid.",
  notFound: "That recording no longer exists.",
  noModel: "That speech model isn't available. Pick another one.",
  generic: "Something went wrong. Try again.",
} as const;

/** Every model on offer, in the order the renderer lists them. */
export type Engines = ReadonlyMap<ModelId, TranscriptionEngine>;

const MAX_STORED_ERROR_LENGTH = 500;
const CLIP_FILE_NAME = "dictation.wav";

/**
 * The main-process side of `window.desktop`. Arguments are typed by the
 * contract but arrive from another process, so every one is parsed again.
 */
export function createDesktopHandlers(repo: RecordingsRepo, engines: Engines): DesktopApi {
  /** The engine about to run; the others let go of their memory while idle. */
  function engineFor(model: ModelId): TranscriptionEngine | null {
    const engine = engines.get(model);
    if (!engine) return null;
    for (const [other, idle] of engines) {
      if (other !== model) idle.release?.();
    }
    return engine;
  }

  async function transcribe(engine: TranscriptionEngine, { id, model }: TranscribeInput): Promise<Recording> {
    const audio = await repo.readAudio(id);
    const result = await engine.transcribe(audio, `${id}.wav`);
    // An engine failure is part of the recording's state, not an IPC failure:
    // the renderer shows the message next to the recording.
    return result.success
      ? repo.setTranscription(id, { status: "done", transcribedAt: new Date().toISOString(), model }, result.data)
      : repo.setTranscription(id, { status: "error", message: result.error.slice(0, MAX_STORED_ERROR_LENGTH) });
  }

  return {
    listRecordings: () => attempt(() => repo.list()),
    createRecording: (input) => {
      const parsed = createRecordingInputSchema.safeParse(input);
      return parsed.success ? attempt(() => repo.create(parsed.data)) : invalid();
    },
    readAudio: (id) => withId(id, (valid) => repo.readAudio(valid)),
    transcribe: (input) => {
      const parsed = transcribeInputSchema.safeParse(input);
      if (!parsed.success) return invalid();
      const engine = engineFor(parsed.data.model);
      return engine ? attempt(() => transcribe(engine, parsed.data)) : unavailable();
    },
    transcribeClip: (input) => {
      const parsed = transcribeClipInputSchema.safeParse(input);
      if (!parsed.success) return invalid();
      const engine = engineFor(parsed.data.model);
      return engine ? engine.transcribe(parsed.data.audio, CLIP_FILE_NAME) : unavailable();
    },
    updateTranscript: (input) => {
      const parsed = updateTranscriptInputSchema.safeParse(input);
      return parsed.success
        ? attempt(() => repo.updateTranscript(parsed.data.id, parsed.data.transcript))
        : invalid();
    },
    deleteRecording: (id) =>
      withId(id, async (valid) => {
        await repo.remove(valid);
        return { id: valid };
      }),
    listModels: () =>
      attempt(() =>
        Promise.all([...engines].map(async ([model, engine]) => ({ model, ...(await engine.status()) }))),
      ),
    prepareModel: (model) => {
      const parsed = modelIdSchema.safeParse(model);
      if (!parsed.success) return invalid();
      const engine = engineFor(parsed.data);
      if (!engine) return unavailable();
      engine.prepare?.();
      return Promise.resolve({ success: true, data: null });
    },
  };
}

function withId<T>(id: string, task: (id: string) => Promise<T>): Promise<Result<T>> {
  const parsed = recordingIdSchema.safeParse(id);
  return parsed.success ? attempt(() => task(parsed.data)) : invalid();
}

async function attempt<T>(task: () => Promise<T>): Promise<Result<T>> {
  try {
    return { success: true, data: await task() };
  } catch (error) {
    if (error instanceof RecordingNotFoundError) {
      return { success: false, error: HANDLER_ERRORS.notFound };
    }
    console.error("[ipc] handler failed:", error instanceof Error ? error.message : error);
    return { success: false, error: HANDLER_ERRORS.generic };
  }
}

function invalid<T>(): Promise<Result<T>> {
  return Promise.resolve({ success: false, error: HANDLER_ERRORS.invalid });
}

function unavailable<T>(): Promise<Result<T>> {
  return Promise.resolve({ success: false, error: HANDLER_ERRORS.noModel });
}
