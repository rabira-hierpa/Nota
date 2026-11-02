import { describe, expect, it } from "vitest";
import { readWav, SAMPLE_RATE } from "@main/speech/wav";

interface Format {
  rate?: number;
  channels?: number;
  bits?: number;
  /** A chunk between "fmt " and "data", as some tools write. */
  extraChunk?: boolean;
}

function wav(samples: readonly number[], { rate = SAMPLE_RATE, channels = 1, bits = 16, extraChunk = false }: Format = {}): Uint8Array {
  const extra = extraChunk ? 8 + 3 + 1 : 0;
  const bytes = new Uint8Array(44 + extra + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.codePointAt(0) ?? 0));
  text(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * (bits / 8), true);
  view.setUint16(32, channels * (bits / 8), true);
  view.setUint16(34, bits, true);
  let at = 36;
  if (extraChunk) {
    text(at, "LIST");
    view.setUint32(at + 4, 3, true); // odd: padded to 4
    at += extra;
  }
  text(at, "data");
  view.setUint32(at + 4, samples.length * 2, true);
  samples.forEach((sample, i) => view.setInt16(at + 8 + i * 2, sample, true));
  return bytes;
}

describe("readWav", () => {
  it("reads Nota's 16 kHz mono 16-bit recordings", () => {
    const result = readWav(wav([0, 1, -1, 32767, -32768]));
    expect(result).toEqual({ success: true, data: new Int16Array([0, 1, -1, 32767, -32768]) });
  });

  it("skips chunks it doesn't need, padding included", () => {
    expect(readWav(wav([5, 6], { extraChunk: true }))).toEqual({ success: true, data: new Int16Array([5, 6]) });
  });

  it("reads from a view that doesn't start its buffer", () => {
    const inner = wav([7, 8]);
    const outer = new Uint8Array(inner.length + 1);
    outer.set(inner, 1);
    expect(readWav(outer.subarray(1))).toEqual({ success: true, data: new Int16Array([7, 8]) });
  });

  it("keeps what is there of a cut-off file", () => {
    const bytes = wav([1, 2, 3]);
    expect(readWav(bytes.subarray(0, bytes.length - 3))).toEqual({ success: true, data: new Int16Array([1]) });
  });

  it("refuses other formats and other files", () => {
    expect(readWav(wav([1], { rate: 44_100 })).success).toBe(false);
    expect(readWav(wav([1], { channels: 2 })).success).toBe(false);
    expect(readWav(wav([1], { bits: 8 })).success).toBe(false);
    expect(readWav(new TextEncoder().encode("ID3 not a wav")).success).toBe(false);
  });
});
