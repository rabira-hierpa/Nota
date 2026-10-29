const SAMPLE_RATE = 48_000;
const BYTES_PER_SAMPLE = 2;
const HEADER_BYTES = 44;
const MAX_AMPLITUDE = 32_767;
const TONE_HZ = 440;

/** A mono 16-bit WAV whose samples (−1…1) come from `sampleAt`. */
function monoWav(seconds: number, sampleAt: (index: number) => number): Buffer {
  const samples = seconds * SAMPLE_RATE;
  const dataBytes = samples * BYTES_PER_SAMPLE;
  const wav = Buffer.alloc(HEADER_BYTES + dataBytes);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(HEADER_BYTES - 8 + dataBytes, 4);
  wav.write("WAVEfmt ", 8, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * BYTES_PER_SAMPLE, 28);
  wav.writeUInt16LE(BYTES_PER_SAMPLE, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples; index += 1) {
    wav.writeInt16LE(Math.round(sampleAt(index) * MAX_AMPLITUDE), HEADER_BYTES + index * BYTES_PER_SAMPLE);
  }
  return wav;
}

/**
 * A mono 16-bit WAV of pure digital silence: what a virtual input such as
 * BlackHole delivers when nothing is routed into it. Fed to Chromium with
 * --use-file-for-fake-audio-capture.
 */
export function silentWav(seconds: number): Buffer {
  return monoWav(seconds, () => 0);
}

/** A steady half-volume tone: a recording with sound in it, for the fake engine to "transcribe". */
export function toneWav(seconds: number): Buffer {
  return monoWav(seconds, (index) => 0.5 * Math.sin((2 * Math.PI * TONE_HZ * index) / SAMPLE_RATE));
}
