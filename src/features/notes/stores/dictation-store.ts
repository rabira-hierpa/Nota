import { create } from "zustand";
import { peakLevel, SILENT_PEAK } from "@/features/notes/lib/audio-level";
import { encodeWav } from "@/features/notes/lib/encode-wav";
import { microphoneErrorMessage, silentRecordingMessage } from "@/features/notes/lib/microphone-error";
import { startPcmCapture } from "@/features/notes/lib/pcm-capture";
import type { PcmCapture } from "@/features/notes/lib/pcm-capture";
import { SpeechSegmenter } from "@/features/notes/lib/speech-segmenter";
import { TARGET_SAMPLE_RATE } from "@/features/notes/lib/to-mono-wav";
import { useEngineStore } from "@/features/notes/stores/engine-store";
import { useNotesStore } from "@/features/notes/stores/notes-store";
import type { Microphone } from "@/features/notes/types/microphone";
import { invokeDesktop } from "@/lib/desktop";
import { MAX_DURATION_MS } from "@shared/schemas/note";
import type { ModelId, ModelStatus } from "@shared/types/engine";

export type DictationState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "listening"; startedAt: number }
  /** Stopped; waiting for the last clips' text. */
  | { kind: "finishing" }
  | { kind: "error"; message: string };

/** Where dictated words go: the note open in the editor. */
export interface DictationTarget {
  noteId: string;
  /** Types the text at the editor's cursor. */
  insert: (text: string) => void;
}

interface DictationStore {
  state: DictationState;
  /** The note being dictated into (or last dictated into). */
  noteId: string | null;
  /** The model transcribing the current (or last) session. */
  model: ModelId | null;
  /** Clips sent and not yet answered. */
  pendingClips: number;
  /** Why the last clip couldn't be transcribed; dictation keeps listening. */
  clipError: string | null;
  start: (microphone: Microphone | null, model: ModelStatus | null, target: DictationTarget) => Promise<void>;
  stop: () => Promise<void>;
  /** The editor for the target went away; later text is appended to the note instead. */
  detach: (noteId: string) => void;
}

/** The microphone and audio of one session; not React state. */
interface Session {
  model: ModelId;
  target: DictationTarget;
  capture: PcmCapture | null;
  segmenter: SpeechSegmenter;
  chunks: Float32Array[];
  sampleCount: number;
  /** Clips are transcribed one after another so the text stays in order. */
  queue: Promise<void>;
  /** A clip failed, so the text has a gap. */
  incomplete: boolean;
}

const MS_PER_SECOND = 1000;
const MIN_SAMPLES = (TARGET_SAMPLE_RATE * 300) / MS_PER_SECOND;
/** Stop a little before the cap so the saved length never exceeds it. */
const AUTO_STOP_SAMPLES = (TARGET_SAMPLE_RATE * (MAX_DURATION_MS - 2000)) / MS_PER_SECOND;
const NO_MODEL = "No speech model is available yet. Check the status at the bottom of the sidebar.";

let session: Session | null = null;

function joinSamples(chunks: readonly Float32Array[], length: number): Float32Array {
  const audio = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    audio.set(chunk, offset);
    offset += chunk.length;
  }
  return audio;
}

/**
 * Live dictation into a note: the microphone is split into clips at each
 * pause (see SpeechSegmenter), each clip is transcribed as soon as it ends,
 * and its text is typed into the note while the user keeps speaking. The
 * audio is kept with the note when it has no recording yet.
 */
export const useDictationStore = create<DictationStore>()((set, get) => {
  function send(current: Session, clip: Float32Array): void {
    set((state) => ({ pendingClips: state.pendingClips + 1 }));
    current.queue = current.queue.then(async () => {
      const audio = encodeWav(clip, TARGET_SAMPLE_RATE);
      const result = await invokeDesktop((api) => api.transcribeClip({ audio, model: current.model }));
      if (result.success) {
        const text = result.data.trim();
        if (text) current.target.insert(text);
      } else {
        current.incomplete = true;
      }
      set((state) => ({
        pendingClips: state.pendingClips - 1,
        clipError: result.success ? state.clipError : result.error,
      }));
    });
  }

  function receive(current: Session, samples: Float32Array): void {
    if (session !== current) return;
    current.chunks.push(samples);
    current.sampleCount += samples.length;
    for (const clip of current.segmenter.push(samples)) send(current, clip);
    if (current.sampleCount >= AUTO_STOP_SAMPLES) void get().stop();
  }

  async function keepAudio(current: Session): Promise<DictationState> {
    const audio = joinSamples(current.chunks, current.sampleCount);
    if (audio.length < MIN_SAMPLES) return { kind: "idle" };
    if (peakLevel(audio) < SILENT_PEAK) {
      return { kind: "error", message: silentRecordingMessage(current.capture?.label ?? null) };
    }
    const notes = useNotesStore.getState();
    const note = notes.notes.find((candidate) => candidate.id === current.target.noteId);
    // A note keeps one recording: the first one it was spoken into.
    if (!note || note.audio || note.trashedAt) return { kind: "idle" };
    const result = await notes.attachAudio({
      id: note.id,
      audio: encodeWav(audio, TARGET_SAMPLE_RATE),
      durationMs: Math.round((audio.length / TARGET_SAMPLE_RATE) * MS_PER_SECOND),
      // With a gap in the text, leave the recording to be transcribed in full.
      transcribedBy: current.incomplete ? undefined : current.model,
    });
    return result.success ? { kind: "idle" } : { kind: "error", message: result.error };
  }

  return {
    state: { kind: "idle" },
    noteId: null,
    model: null,
    pendingClips: 0,
    clipError: null,

    start: async (microphone, model, target) => {
      const { kind } = get().state;
      if (kind !== "idle" && kind !== "error") return;
      if (!model || model.kind === "offline") {
        set({ state: { kind: "error", message: model?.kind === "offline" ? model.reason : NO_MODEL } });
        return;
      }
      set({ state: { kind: "starting" }, noteId: target.noteId, model: model.model, pendingClips: 0, clipError: null });
      useEngineStore.getState().prepare();

      const current: Session = {
        model: model.model,
        target,
        capture: null,
        segmenter: new SpeechSegmenter(),
        chunks: [],
        sampleCount: 0,
        queue: Promise.resolve(),
        incomplete: false,
      };
      session = current;
      try {
        current.capture = await startPcmCapture(microphone, (samples) => receive(current, samples));
      } catch (error) {
        session = null;
        set({ state: { kind: "error", message: microphoneErrorMessage(error instanceof DOMException ? error.name : "") } });
        return;
      }
      if (session !== current) {
        // Stopped (or the note closed) while the microphone was starting.
        await current.capture.stop();
        return;
      }
      set({ state: { kind: "listening", startedAt: Date.now() } });
    },

    stop: async () => {
      const current = session;
      if (!current) return;
      session = null;
      set({ state: { kind: "finishing" } });
      await current.capture?.stop();
      const last = current.segmenter.flush();
      if (last) send(current, last);
      await current.queue;
      set({ state: await keepAudio(current) });
    },

    detach: (noteId) => {
      const current = session;
      if (!current || current.target.noteId !== noteId) return;
      current.target = { noteId, insert: (text) => void useNotesStore.getState().appendText(noteId, text) };
      void get().stop();
    },
  };
});
