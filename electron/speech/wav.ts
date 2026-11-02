import type { Result } from "@shared/types/result";

export const SAMPLE_RATE = 16_000;

const PCM = 1;
const HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const BYTES_PER_SAMPLE = 2;

function ascii(bytes: Uint8Array, start: number): string {
  return String.fromCodePoint(...bytes.subarray(start, start + 4));
}

/** The format fields Nota relies on, from a "fmt " chunk's body. */
function isNotaFormat(view: DataView, start: number): boolean {
  const format = view.getUint16(start, true);
  const channels = view.getUint16(start + 2, true);
  const rate = view.getUint32(start + 4, true);
  const bits = view.getUint16(start + 14, true);
  return format === PCM && channels === 1 && rate === SAMPLE_RATE && bits === BYTES_PER_SAMPLE * 8;
}

/**
 * The samples of a 16 kHz mono 16-bit PCM WAV, the only kind Nota stores
 * (recordings, dictation clips and imported files are all converted to it).
 */
export function readWav(bytes: Uint8Array): Result<Int16Array> {
  if (bytes.length < HEADER_BYTES || ascii(bytes, 0) !== "RIFF" || ascii(bytes, 8) !== "WAVE") {
    return { success: false, error: "not a WAV file" };
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let formatOk = false;
  for (let offset = HEADER_BYTES; offset + CHUNK_HEADER_BYTES <= bytes.length; ) {
    const id = ascii(bytes, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + CHUNK_HEADER_BYTES;
    if (id === "fmt ") formatOk = size >= 16 && body + 16 <= bytes.length && isNotaFormat(view, body);
    if (id === "data") {
      if (!formatOk) return { success: false, error: "expected 16 kHz mono 16-bit PCM" };
      const end = Math.min(body + size, bytes.length);
      const usable = end - body - ((end - body) % BYTES_PER_SAMPLE);
      // A copy, so the samples sit on an aligned buffer of their own.
      return { success: true, data: new Int16Array(bytes.slice(body, body + usable).buffer) };
    }
    // Chunks are padded to an even length.
    offset = body + size + (size % 2);
  }
  return { success: false, error: "no audio in the WAV file" };
}
