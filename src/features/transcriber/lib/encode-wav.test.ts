import { describe, expect, it } from "vitest";
import { encodeWav } from "@/features/transcriber/lib/encode-wav";

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

describe("encodeWav", () => {
  it("writes a 16-bit mono PCM header for the sample rate", () => {
    const wav = encodeWav(new Float32Array(4), 16_000);
    const view = new DataView(wav.buffer);

    expect(wav.byteLength).toBe(44 + 8);
    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(wav.byteLength - 8);
    expect(ascii(wav, 8, 8)).toBe("WAVEfmt ");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint32(28, true)).toBe(32_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(wav, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(8);
  });

  it("scales samples to int16 and clamps anything out of range", () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 2, -2, 0.5]), 16_000);
    const view = new DataView(wav.buffer);
    const samples = [0, 1, 2, 3, 4, 5].map((index) => view.getInt16(44 + index * 2, true));
    expect(samples).toEqual([0, 32767, -32768, 32767, -32768, 16384]);
  });
});
