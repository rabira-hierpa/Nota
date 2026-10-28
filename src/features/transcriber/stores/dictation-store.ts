import { create } from "zustand";
import { peakLevel, SILENT_PEAK } from "@/features/transcriber/lib/audio-level";
import { encodeWav } from "@/features/transcriber/lib/encode-wav";
import { microphoneErrorMessage, silentRecordingMessage } from "@/features/transcriber/lib/microphone-error";
import { startPcmCapture } from "@/features/transcriber/lib/pcm-capture";
import type { PcmCapture } from "@/features/transcriber/lib/pcm-capture";
import { SpeechSegmenter } from "@/features/transcriber/lib/speech-segmenter";
import { TARGET_SAMPLE_RATE } from "@/features/transcriber/lib/to-mono-wav";
import { useEngineStore } from "@/features/transcriber/stores/engine-store";
import { useRecordingsStore } from "@/features/transcriber/stores/recordings-store";
import type { Microphone } from "@/features/transcriber/types/microphone";
import { invokeDesktop } from "@/lib/desktop";
import { MAX_DURATION_MS, MAX_TRANSCRIPT_LENGTH } from "@shared/schemas/recording";
import type { ModelId, ModelStatus } from "@shared/types/engine";

export type DictationState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "listening"; startedAt: number }
  /** Stopped; waiting for the last clips' text before saving. */
  | { kind: "finishing" }
  | { kind: "error"; message: string };

interface DictationStore {
  state: DictationState;
  /** The model transcribing the current (or last) session. */
  model: ModelId | null;
  /** The text so far, one piece per clip, in the order spoken. */
  text: string;
  /** Clips sent and not yet answered. */
  pendingClips: number;
  /** Why the last clip couldn't be transcribed; dictation keeps listening. */
  clipError: string | null;
  start: (microphone: Microphone | null, model: ModelStatus | null) => Promise<void>;
  stop: () => Promise<void>;
}

/** The microphone and audio of one session; not React state. */
interface Session {
  model: ModelId;
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
const TOO_SHORT = "That dictation was too short. Try again.";

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

function appendText(text: string, clipText: string): string {
  return [text, clipText.trim()].filter(Boolean).join(" ");
}

/**
 * Live dictation: the microphone is split into clips at each pause (see
 * SpeechSegmenter), each clip is transcribed as soon as it ends, and the text
 * grows while the user speaks. Stopping saves the whole recording with that
 * text, like any other recording.
 */
export const useDictationStore = create<DictationStore>()((set, get) => {
  function send(current: Session, clip: Float32Array): void {
    set((state) => ({ pendingClips: state.pendingClips + 1 }));
    current.queue = current.queue.then(async () => {
      const audio = encodeWav(clip, TARGET_SAMPLE_RATE);
      const result = await invokeDesktop((api) => api.transcribeClip({ audio, model: current.model }));
      if (!result.success) current.incomplete = true;
      set((state) => ({
        pendingClips: state.pendingClips - 1,
        ...(result.success
          ? { text: appendText(state.text, result.data), clipError: null }
          : { clipError: result.error }),
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

  async function save(current: Session): Promise<DictationState> {
    const audio = joinSamples(current.chunks, current.sampleCount);
    if (audio.length < MIN_SAMPLES) return { kind: "error", message: TOO_SHORT };
    if (peakLevel(audio) < SILENT_PEAK) {
      return { kind: "error", message: silentRecordingMessage(current.capture?.label ?? null) };
    }
    const result = await useRecordingsStore.getState().add({
      audio: encodeWav(audio, TARGET_SAMPLE_RATE),
      durationMs: Math.round((audio.length / TARGET_SAMPLE_RATE) * MS_PER_SECOND),
      // With a gap in the text, transcribe the whole recording instead.
      dictated: current.incomplete
        ? undefined
        : { transcript: get().text.slice(0, MAX_TRANSCRIPT_LENGTH), model: current.model },
    });
    return result.success ? { kind: "idle" } : { kind: "error", message: result.error };
  }

  return {
    state: { kind: "idle" },
    model: null,
    text: "",
    pendingClips: 0,
    clipError: null,

    start: async (microphone, model) => {
      const { kind } = get().state;
      if (kind !== "idle" && kind !== "error") return;
      if (!model || model.kind === "offline") {
        set({ state: { kind: "error", message: model?.kind === "offline" ? model.reason : NO_MODEL } });
        return;
      }
      set({ state: { kind: "starting" }, model: model.model, text: "", pendingClips: 0, clipError: null });
      useEngineStore.getState().prepare();

      const current: Session = {
        model: model.model,
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
      set({ state: { kind: "listening", startedAt: Date.now() } });
    },

    stop: async () => {
      const current = session;
      if (!current || get().state.kind !== "listening") return;
      session = null;
      set({ state: { kind: "finishing" } });
      await current.capture?.stop();
      const last = current.segmenter.flush();
      if (last) send(current, last);
      await current.queue;
      set({ state: await save(current) });
    },
  };
});
