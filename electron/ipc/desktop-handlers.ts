import { RecordingNotFoundError } from "@main/lib/recordings-repo";
import type { RecordingsRepo } from "@main/lib/recordings-repo";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import {
  createRecordingInputSchema,
  recordingIdSchema,
  updateTranscriptInputSchema,
} from "@shared/schemas/recording";
import type { DesktopApi } from "@shared/types/desktop-api";
import type { Recording } from "@shared/types/recording";
import type { Result } from "@shared/types/result";

export const HANDLER_ERRORS = {
  invalid: "That request wasn't valid.",
  notFound: "That recording no longer exists.",
  generic: "Something went wrong. Try again.",
} as const;

const MAX_STORED_ERROR_LENGTH = 500;

/**
 * The main-process side of `window.desktop`. Arguments are typed by the
 * contract but arrive from another process, so every one is parsed again.
 */
export function createDesktopHandlers(repo: RecordingsRepo, engine: TranscriptionEngine): DesktopApi {
  async function transcribe(id: string): Promise<Recording> {
    const audio = await repo.readAudio(id);
    const result = await engine.transcribe(audio, `${id}.wav`);
    // An engine failure is part of the recording's state, not an IPC failure:
    // the renderer shows the message next to the recording.
    return result.success
      ? repo.setTranscription(id, { status: "done", transcribedAt: new Date().toISOString() }, result.data)
      : repo.setTranscription(id, { status: "error", message: result.error.slice(0, MAX_STORED_ERROR_LENGTH) });
  }

  return {
    listRecordings: () => attempt(() => repo.list()),
    createRecording: (input) => {
      const parsed = createRecordingInputSchema.safeParse(input);
      return parsed.success ? attempt(() => repo.create(parsed.data)) : invalid();
    },
    readAudio: (id) => withId(id, (valid) => repo.readAudio(valid)),
    transcribe: (id) => withId(id, transcribe),
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
    engineStatus: () => attempt(() => engine.status()),
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
