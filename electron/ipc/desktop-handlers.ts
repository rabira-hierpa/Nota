import { NoteNotFoundError, NoteStateError } from "@main/lib/notes-repo";
import type { NotesRepo } from "@main/lib/notes-repo";
import { PasswordExistsError, VaultLockedError, WrongPasswordError } from "@main/lib/note-vault";
import type { NoteVault } from "@main/lib/note-vault";
import type { ModelSetup } from "@main/lib/model-setup";
import type { Onboarding } from "@main/lib/onboarding";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import { localModelIdSchema, modelIdSchema } from "@shared/schemas/engine";
import {
  attachAudioInputSchema,
  createNoteInputSchema,
  createVoiceNoteInputSchema,
  exportNoteInputSchema,
  noteIdSchema,
  passwordSchema,
  setArchivedInputSchema,
  setFavoriteInputSchema,
  setLockedInputSchema,
  setPinnedInputSchema,
  setTrashedInputSchema,
  transcribeClipInputSchema,
  transcribeInputSchema,
  updateNoteContentInputSchema,
} from "@shared/schemas/note";
import type { DesktopApi } from "@shared/types/desktop-api";
import type { ModelId } from "@shared/types/engine";
import type { ExportNoteInput, Note, TranscribeInput } from "@shared/types/note";
import type { Result } from "@shared/types/result";
import type { z } from "zod";

export const HANDLER_ERRORS = {
  invalid: "That request wasn't valid.",
  notFound: "That note no longer exists.",
  state: "That can't be done to this note right now.",
  locked: "Locked notes need your password. Unlock them, then try again.",
  wrongPassword: "That password isn't right.",
  noModel: "That speech model isn't available. Pick another one.",
  setupRunning: "A setup is already running. Wait for it to finish.",
  generic: "Something went wrong. Try again.",
} as const;

/** Every model on offer, in the order the renderer lists them. */
export type Engines = ReadonlyMap<ModelId, TranscriptionEngine>;

/** Saves an export where the user picks (a save dialog); false if they cancel. */
export type SaveExport = (input: ExportNoteInput) => Promise<boolean>;

export interface HandlerDeps {
  repo: NotesRepo;
  engines: Engines;
  vault: NoteVault;
  saveExport: SaveExport;
  setup: ModelSetup;
  onboarding: Onboarding;
}

const MAX_STORED_ERROR_LENGTH = 500;
const CLIP_FILE_NAME = "dictation.wav";

/**
 * The main-process side of `window.desktop`. Arguments are typed by the
 * contract but arrive from another process, so every one is parsed again.
 */
export function createDesktopHandlers({ repo, engines, vault, saveExport, setup, onboarding }: HandlerDeps): DesktopApi {
  /** The engine about to run; the others let go of their memory while idle. */
  function engineFor(model: ModelId): TranscriptionEngine | null {
    const engine = engines.get(model);
    if (!engine) return null;
    for (const [other, idle] of engines) {
      if (other !== model) idle.release?.();
    }
    return engine;
  }

  async function transcribe(engine: TranscriptionEngine, { id, model }: TranscribeInput): Promise<Note> {
    const audio = await repo.readAudio(id);
    const result = await engine.transcribe(audio, `${id}.wav`);
    // An engine failure is part of the note's state, not an IPC failure: the
    // renderer shows the message on the note.
    return result.success
      ? repo.setTranscription(id, { status: "done", transcribedAt: new Date().toISOString(), model }, result.data)
      : repo.setTranscription(id, { status: "error", message: result.error.slice(0, MAX_STORED_ERROR_LENGTH) });
  }

  return {
    listNotes: () => attempt(() => repo.list()),
    createNote: (input) => withValid(createNoteInputSchema, input, (valid) => repo.create(valid)),
    createVoiceNote: (input) => withValid(createVoiceNoteInputSchema, input, (valid) => repo.createVoice(valid)),
    updateNoteContent: (input) =>
      withValid(updateNoteContentInputSchema, input, ({ id, content, text }) => repo.updateContent(id, { content, text })),
    setFavorite: (input) =>
      withValid(setFavoriteInputSchema, input, ({ id, favorite }) => repo.setFavorite(id, favorite)),
    setTrashed: (input) => withValid(setTrashedInputSchema, input, ({ id, trashed }) => repo.setTrashed(id, trashed)),
    deleteNote: (id) =>
      withValid(noteIdSchema, id, async (valid) => {
        await repo.remove(valid);
        return { id: valid };
      }),
    emptyTrash: () => attempt(async () => ({ ids: await repo.emptyTrash() })),
    setPinned: (input) => withValid(setPinnedInputSchema, input, ({ id, pinned }) => repo.setPinned(id, pinned)),
    setArchived: (input) =>
      withValid(setArchivedInputSchema, input, ({ id, archived }) => repo.setArchived(id, archived)),
    setLocked: (input) => withValid(setLockedInputSchema, input, ({ id, locked }) => repo.setLocked(id, locked)),
    openLockedNote: (id) => withValid(noteIdSchema, id, (valid) => repo.openLocked(valid)),
    getLockStatus: () => attempt(() => vault.status()),
    setLockPassword: (password) => withValid(passwordSchema, password, (valid) => vault.setPassword(valid)),
    unlockNotes: (password) => withValid(passwordSchema, password, (valid) => vault.unlock(valid)),
    lockNotes: () =>
      attempt(async () => {
        // Let saves already sent (an editor closing as the notes lock) seal first.
        await repo.flush();
        vault.lock();
        return vault.status();
      }),
    exportNote: (input) => withValid(exportNoteInputSchema, input, async (valid) => ({ saved: await saveExport(valid) })),
    attachAudio: (input) =>
      withValid(attachAudioInputSchema, input, ({ id, audio, durationMs, transcribedBy }) =>
        repo.attachAudio(id, { audio, durationMs }, transcribedBy),
      ),
    readAudio: (id) => withValid(noteIdSchema, id, (valid) => repo.readAudio(valid)),
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
    startModelSetup: (model) => {
      const parsed = localModelIdSchema.safeParse(model);
      if (!parsed.success) return invalid();
      return Promise.resolve(
        setup.start(parsed.data) ? { success: true, data: null } : { success: false, error: HANDLER_ERRORS.setupRunning },
      );
    },
    cancelModelSetup: () => {
      setup.cancel();
      return Promise.resolve({ success: true, data: null });
    },
    getOnboarding: () => attempt(async () => ({ show: await onboarding.shouldShow() })),
    completeOnboarding: () =>
      attempt(async () => {
        await onboarding.complete();
        return null;
      }),
  };
}

function withValid<S extends z.ZodType, T>(
  schema: S,
  input: z.input<S>,
  task: (valid: z.output<S>) => Promise<T>,
): Promise<Result<T>> {
  const parsed = schema.safeParse(input);
  return parsed.success ? attempt(() => task(parsed.data)) : invalid();
}

async function attempt<T>(task: () => Promise<T>): Promise<Result<T>> {
  try {
    return { success: true, data: await task() };
  } catch (error) {
    const known = error instanceof Error ? knownError(error) : null;
    if (known) return { success: false, error: known };
    console.error("[ipc] handler failed:", error instanceof Error ? error.message : error);
    return { success: false, error: HANDLER_ERRORS.generic };
  }
}

/** The user-facing message for an expected failure; null for a real fault. */
function knownError(error: Error): string | null {
  if (error instanceof NoteNotFoundError) return HANDLER_ERRORS.notFound;
  if (error instanceof NoteStateError || error instanceof PasswordExistsError) return HANDLER_ERRORS.state;
  if (error instanceof VaultLockedError) return HANDLER_ERRORS.locked;
  if (error instanceof WrongPasswordError) return HANDLER_ERRORS.wrongPassword;
  return null;
}

function invalid<T>(): Promise<Result<T>> {
  return Promise.resolve({ success: false, error: HANDLER_ERRORS.invalid });
}

function unavailable<T>(): Promise<Result<T>> {
  return Promise.resolve({ success: false, error: HANDLER_ERRORS.noModel });
}
