import { describe, expect, it } from "vitest";
import { SpeechSegmenter } from "@/features/transcriber/lib/speech-segmenter";

const RATE = 16_000;
const LOUD = 0.1;

function sound(ms: number, level: number): Float32Array {
  // Alternating signs: an RMS of exactly `level`, like a steady voice.
  return Float32Array.from({ length: (RATE * ms) / 1000 }, (_, index) => (index % 2 === 0 ? level : -level));
}

const speech = (ms: number) => sound(ms, LOUD);
const silence = (ms: number) => new Float32Array((RATE * ms) / 1000);

function seconds(clip: Float32Array | null | undefined): number {
  return (clip?.length ?? 0) / RATE;
}

function concat(...parts: Float32Array[]): Float32Array {
  const joined = new Float32Array(parts.reduce((length, part) => length + part.length, 0));
  parts.reduce((offset, part) => (joined.set(part, offset), offset + part.length), 0);
  return joined;
}

/** Feeds audio the way the capture worklet does: ~100 ms at a time. */
function feed(segmenter: SpeechSegmenter, audio: Float32Array): Float32Array[] {
  const clips: Float32Array[] = [];
  for (let offset = 0; offset < audio.length; offset += 1600) {
    clips.push(...segmenter.push(audio.subarray(offset, offset + 1600)));
  }
  return clips;
}

describe("SpeechSegmenter", () => {
  it("sends a stretch of speech as soon as the speaker pauses", () => {
    const clips = feed(new SpeechSegmenter(), concat(silence(1000), speech(1500), silence(800)));

    expect(clips).toHaveLength(1);
    // A short lead-in, the speech, and the pause that ended it.
    expect(seconds(clips[0])).toBeCloseTo(0.3 + 1.5 + 0.5, 1);
  });

  it("keeps a sentence together through a short breath", () => {
    const clips = feed(new SpeechSegmenter(), concat(speech(600), silence(350), speech(600), silence(800)));
    expect(clips).toHaveLength(1);
  });

  it("splits at each real pause", () => {
    const clips = feed(new SpeechSegmenter(), concat(speech(900), silence(800), speech(900), silence(800)));
    expect(clips).toHaveLength(2);
  });

  it("never sends silence or a click", () => {
    const segmenter = new SpeechSegmenter();
    expect(feed(segmenter, concat(silence(3000), speech(60), silence(1000), silence(2000)))).toEqual([]);
    expect(segmenter.flush()).toBeNull();
  });

  it("cuts speech that never pauses at its quietest moment", () => {
    const segmenter = new SpeechSegmenter();
    const dip = sound(300, 0.02); // quieter, but still speech
    const clips = feed(segmenter, concat(speech(17_010), dip, speech(6_000)));

    expect(clips).toHaveLength(1);
    expect(seconds(clips[0])).toBeGreaterThan(17);
    expect(seconds(clips[0])).toBeLessThan(17.4);
    expect(seconds(segmenter.flush())).toBeGreaterThan(5.5);
  });

  it("hands over the last words when the microphone stops mid-sentence", () => {
    const segmenter = new SpeechSegmenter();
    expect(feed(segmenter, speech(1010))).toEqual([]);
    expect(seconds(segmenter.flush())).toBeCloseTo(1.01, 2);
  });
});
