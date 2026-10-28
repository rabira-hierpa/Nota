import { peakLevel } from "@/features/notes/lib/audio-level";
import { encodeWav } from "@/features/notes/lib/encode-wav";
import type { CreateVoiceNoteInput } from "@shared/types/note";

/** What Whisper-family models expect; anything else is resampled anyway. */
export const TARGET_SAMPLE_RATE = 16_000;
const MS_PER_SECOND = 1000;

export interface ConvertedRecording {
  input: CreateVoiceNoteInput;
  /** Loudest sample, 0…1, so the caller can refuse a silent recording. */
  peak: number;
}

/**
 * Turns a MediaRecorder blob (WebM/Opus) into 16 kHz mono WAV: a format every
 * VoiceStudio engine reads, with a real duration header so playback can seek.
 */
export async function toMonoWav(blob: Blob): Promise<ConvertedRecording> {
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    await context.close();
  }

  const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  return {
    input: {
      audio: encodeWav(samples, TARGET_SAMPLE_RATE),
      durationMs: Math.round(decoded.duration * MS_PER_SECOND),
    },
    peak: peakLevel(samples),
  };
}
