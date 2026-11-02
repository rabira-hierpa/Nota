import { SAMPLE_RATE } from "@main/speech/wav";

/**
 * Hohe's input: SeamlessM4T filter banks, as transformers'
 * SeamlessM4TFeatureExtractor makes them (Kaldi-style 25 ms frames every
 * 10 ms, 80 log-mel bins, each bin normalised over the clip, frames paired).
 * Parity with Python is tested against fixtures from scripts/build_speech_models.py.
 */

const FRAME_LENGTH = 400;
const HOP_LENGTH = 160;
const FFT_LENGTH = 512;
const FREQUENCY_BINS = FFT_LENGTH / 2 + 1;
const MEL_BINS = 80;
const MIN_FREQUENCY = 20;
const PREEMPHASIS = 0.97;
const POVEY_POWER = 0.85;
const MEL_FLOOR = 1.192092955078125e-7;
const VARIANCE_EPSILON = 1e-7;
/** Frames are paired into one step of the model's input. */
const STRIDE = 2;
/** What transformers pads an odd last frame with (preprocessor_config.json). */
const PADDING_VALUE = 1;

export const FEATURE_SIZE = MEL_BINS * STRIDE;

/** Kaldi's mel scale. */
function hertzToMel(hertz: number): number {
  return 1127 * Math.log(1 + hertz / 700);
}

/** np.hanning(400) ** 0.85: Kaldi's Povey window. */
function poveyWindow(): Float64Array {
  const window = new Float64Array(FRAME_LENGTH);
  for (let n = 0; n < FRAME_LENGTH; n++) {
    window[n] = (0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (FRAME_LENGTH - 1))) ** POVEY_POWER;
  }
  return window;
}

/** Triangular filters laid out in mel space, [bin][mel], as transformers' mel_filter_bank(mel_scale="kaldi", triangularize_in_mel_space=True). */
function melFilters(): Float64Array {
  const melMin = hertzToMel(MIN_FREQUENCY);
  const melMax = hertzToMel(SAMPLE_RATE / 2);
  const step = (melMax - melMin) / (MEL_BINS + 1);
  const centres = Array.from({ length: MEL_BINS + 2 }, (_, i) => (i === MEL_BINS + 1 ? melMax : melMin + i * step));
  const binWidth = SAMPLE_RATE / ((FREQUENCY_BINS - 1) * 2);
  const filters = new Float64Array(FREQUENCY_BINS * MEL_BINS);
  for (let bin = 0; bin < FREQUENCY_BINS; bin++) {
    const mel = hertzToMel(binWidth * bin);
    for (let m = 0; m < MEL_BINS; m++) {
      const rising = (mel - centres[m]) / (centres[m + 1] - centres[m]);
      const falling = (centres[m + 2] - mel) / (centres[m + 2] - centres[m + 1]);
      filters[bin * MEL_BINS + m] = Math.max(0, Math.min(rising, falling));
    }
  }
  return filters;
}

/** Bit-reversed order and twiddle factors for a radix-2 FFT of FFT_LENGTH points. */
function fftTables(): { reversed: Uint16Array; cos: Float64Array; sin: Float64Array } {
  const bits = Math.log2(FFT_LENGTH);
  const reversed = new Uint16Array(FFT_LENGTH);
  for (let i = 0; i < FFT_LENGTH; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    reversed[i] = r;
  }
  const cos = new Float64Array(FFT_LENGTH / 2);
  const sin = new Float64Array(FFT_LENGTH / 2);
  for (let k = 0; k < FFT_LENGTH / 2; k++) {
    cos[k] = Math.cos((2 * Math.PI * k) / FFT_LENGTH);
    sin[k] = -Math.sin((2 * Math.PI * k) / FFT_LENGTH);
  }
  return { reversed, cos, sin };
}

const WINDOW = poveyWindow();
const FILTERS = melFilters();
const FFT = fftTables();

/** In-place radix-2 FFT of `re`/`im`, already in bit-reversed order. */
function fft(re: Float64Array, im: Float64Array): void {
  for (let size = 2; size <= FFT_LENGTH; size *= 2) {
    const half = size / 2;
    const stride = FFT_LENGTH / size;
    for (let start = 0; start < FFT_LENGTH; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = FFT.cos[k * stride];
        const wi = FFT.sin[k * stride];
        const a = start + k;
        const b = a + half;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

/** One frame's power spectrum: DC removed, pre-emphasised, windowed, zero-padded to 512. */
function powerSpectrum(samples: Int16Array, start: number, power: Float64Array): void {
  const frame = new Float64Array(FRAME_LENGTH);
  let mean = 0;
  for (let i = 0; i < FRAME_LENGTH; i++) mean += samples[start + i];
  mean /= FRAME_LENGTH;
  for (let i = 0; i < FRAME_LENGTH; i++) frame[i] = samples[start + i] - mean;
  // Backwards, so each sample is emphasised against its original neighbour.
  for (let i = FRAME_LENGTH - 1; i > 0; i--) frame[i] -= PREEMPHASIS * frame[i - 1];
  frame[0] *= 1 - PREEMPHASIS;
  const re = new Float64Array(FFT_LENGTH);
  const im = new Float64Array(FFT_LENGTH);
  for (let i = 0; i < FRAME_LENGTH; i++) re[FFT.reversed[i]] = frame[i] * WINDOW[i];
  fft(re, im);
  // transformers keeps the spectrum as complex64, so round to float32 as it does.
  for (let bin = 0; bin < FREQUENCY_BINS; bin++) {
    const r = Math.fround(re[bin]);
    const i = Math.fround(im[bin]);
    power[bin] = r * r + i * i;
  }
}

/** Log-mel energies, [frame][mel]. */
function logMel(samples: Int16Array, frames: number): Float32Array {
  const out = new Float32Array(frames * MEL_BINS);
  const power = new Float64Array(FREQUENCY_BINS);
  for (let f = 0; f < frames; f++) {
    powerSpectrum(samples, f * HOP_LENGTH, power);
    for (let m = 0; m < MEL_BINS; m++) {
      let energy = 0;
      for (let bin = 0; bin < FREQUENCY_BINS; bin++) energy += FILTERS[bin * MEL_BINS + m] * power[bin];
      out[f * MEL_BINS + m] = Math.log(Math.max(MEL_FLOOR, energy));
    }
  }
  return out;
}

/** Each mel bin to zero mean and unit variance over the clip (sample variance, as numpy's ddof=1). */
function normalise(mel: Float32Array, frames: number): void {
  for (let m = 0; m < MEL_BINS; m++) {
    let sum = 0;
    for (let f = 0; f < frames; f++) sum += mel[f * MEL_BINS + m];
    const mean = sum / frames;
    let squares = 0;
    for (let f = 0; f < frames; f++) squares += (mel[f * MEL_BINS + m] - mean) ** 2;
    const scale = Math.sqrt(squares / (frames - 1) + VARIANCE_EPSILON);
    for (let f = 0; f < frames; f++) mel[f * MEL_BINS + m] = (mel[f * MEL_BINS + m] - mean) / scale;
  }
}

/** The fewest samples that make two frames (the variance needs two). */
export const MIN_SAMPLES = FRAME_LENGTH + HOP_LENGTH;

/**
 * Hohe's `input_features` for 16 kHz samples: `steps` rows of FEATURE_SIZE,
 * flat. Needs at least MIN_SAMPLES.
 */
export function hoheFeatures(samples: Int16Array): { data: Float32Array; steps: number } {
  const frames = Math.floor((samples.length - FRAME_LENGTH) / HOP_LENGTH) + 1;
  const mel = logMel(samples, frames);
  normalise(mel, frames);
  const steps = Math.ceil(frames / STRIDE);
  // Pairs of frames side by side are already one row each in this flat layout;
  // an odd last frame is padded as transformers pads it.
  const data = new Float32Array(steps * FEATURE_SIZE).fill(PADDING_VALUE);
  data.set(mel);
  return { data, steps };
}
