import { encodeWav } from "@/features/transcriber/lib/encode-wav";
import type { CreateRecordingInput } from "@shared/types/recording";

/** What Whisper-family models expect; anything else is resampled anyway. */
export const TARGET_SAMPLE_RATE = 16_000;
const MS_PER_SECOND = 1000;

/**
 * Turns a MediaRecorder blob (WebM/Opus) into 16 kHz mono WAV: a format every
 * VoiceStudio engine reads, with a real duration header so playback can seek.
 */
export async function toMonoWav(blob: Blob): Promise<CreateRecordingInput> {
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
  const rendered = await offline.startRendering();

  return {
    audio: encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE),
    durationMs: Math.round(decoded.duration * MS_PER_SECOND),
  };
}
