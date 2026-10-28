export interface SegmenterOptions {
  sampleRate: number;
  /** A 30 ms frame whose RMS reaches this counts as speech (about −40 dBFS). */
  speechRms: number;
  /** Silence this long after speech ends a clip. */
  pauseMs: number;
  /** Speech that runs this long without a pause is cut at its quietest moment… */
  maxClipMs: number;
  /** …within this final stretch. */
  cutSearchMs: number;
  /** Clips with less speech than this (a click, a cough) are dropped. */
  minSpeechMs: number;
  /** Silence kept ahead of the first word so it isn't clipped. */
  leadInMs: number;
}

export const DEFAULT_SEGMENTER_OPTIONS: SegmenterOptions = {
  sampleRate: 16_000,
  speechRms: 0.01,
  pauseMs: 500,
  maxClipMs: 20_000,
  cutSearchMs: 5_000,
  minSpeechMs: 150,
  leadInMs: 300,
};

const FRAME_MS = 30;
const MS_PER_SECOND = 1000;

interface Frame {
  samples: Float32Array;
  rms: number;
  speech: boolean;
}

function rootMeanSquare(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return samples.length === 0 ? 0 : Math.sqrt(sum / samples.length);
}

function join(parts: readonly Float32Array[]): Float32Array {
  const joined = new Float32Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

/**
 * Splits live microphone audio into clips at the speaker's pauses, so
 * dictation can transcribe each stretch of speech as soon as it ends. Silence
 * on its own never becomes a clip (Whisper-family models invent text for it).
 */
export class SpeechSegmenter {
  private readonly frameSize: number;
  private readonly pauseFrames: number;
  private readonly maxFrames: number;
  private readonly cutSearchFrames: number;
  private readonly minSpeechFrames: number;
  private readonly leadInFrames: number;
  /** Samples still short of a whole frame. */
  private partial = new Float32Array(0);
  private frames: Frame[] = [];

  constructor(private readonly options: SegmenterOptions = DEFAULT_SEGMENTER_OPTIONS) {
    const frames = (ms: number) => Math.max(1, Math.round(ms / FRAME_MS));
    this.frameSize = Math.round((options.sampleRate * FRAME_MS) / MS_PER_SECOND);
    this.pauseFrames = frames(options.pauseMs);
    this.maxFrames = frames(options.maxClipMs);
    this.cutSearchFrames = frames(options.cutSearchMs);
    this.minSpeechFrames = frames(options.minSpeechMs);
    this.leadInFrames = frames(options.leadInMs);
  }

  /** Feeds microphone samples; returns the clips this completed, oldest first. */
  push(samples: Float32Array): Float32Array[] {
    const pending = join([this.partial, samples]);
    const clips: Float32Array[] = [];
    let offset = 0;
    for (; offset + this.frameSize <= pending.length; offset += this.frameSize) {
      const clip = this.addFrame(pending.subarray(offset, offset + this.frameSize));
      if (clip) clips.push(clip);
    }
    this.partial = pending.slice(offset);
    return clips;
  }

  /** The speech still waiting for a pause, once the microphone stops. */
  flush(): Float32Array | null {
    if (this.partial.length > 0) this.frames.push(this.toFrame(this.partial));
    this.partial = new Float32Array(0);
    return this.take(this.frames.length);
  }

  private toFrame(samples: Float32Array): Frame {
    const rms = rootMeanSquare(samples);
    return { samples, rms, speech: rms >= this.options.speechRms };
  }

  private addFrame(samples: Float32Array): Float32Array | null {
    this.frames.push(this.toFrame(samples));
    if (!this.frames.some((frame) => frame.speech)) {
      // Before any speech, keep only a short lead-in of silence.
      if (this.frames.length > this.leadInFrames) this.frames.shift();
      return null;
    }
    if (this.trailingSilence() >= this.pauseFrames) return this.take(this.frames.length);
    if (this.frames.length >= this.maxFrames) return this.take(this.quietestCut());
    return null;
  }

  private trailingSilence(): number {
    let count = 0;
    for (let index = this.frames.length - 1; index >= 0 && !this.frames[index].speech; index -= 1) count += 1;
    return count;
  }

  /** Frames up to and including the quietest one near the end. */
  private quietestCut(): number {
    let quietest = Math.max(0, this.frames.length - this.cutSearchFrames);
    for (let index = quietest + 1; index < this.frames.length; index += 1) {
      if (this.frames[index].rms < this.frames[quietest].rms) quietest = index;
    }
    return quietest + 1;
  }

  /** Removes the first `count` frames; returns them as a clip if they hold enough speech. */
  private take(count: number): Float32Array | null {
    const taken = this.frames.splice(0, count);
    const speech = taken.filter((frame) => frame.speech).length;
    return speech >= this.minSpeechFrames ? join(taken.map((frame) => frame.samples)) : null;
  }
}
