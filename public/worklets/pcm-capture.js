/* global AudioWorkletProcessor, registerProcessor */
// Runs on the audio thread (AudioWorkletGlobalScope) for dictation: forwards
// the microphone's samples to the page in ~100 ms batches. Loaded by
// src/features/transcriber/lib/pcm-capture.ts; a plain script because
// worklets are fetched by URL, not bundled.

const BATCH_SAMPLES = 1600;

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batch = new Float32Array(BATCH_SAMPLES);
    this.filled = 0;
  }

  process(inputs) {
    const samples = inputs[0]?.[0];
    if (samples) this.append(samples);
    return true;
  }

  append(samples) {
    let offset = 0;
    while (offset < samples.length) {
      const count = Math.min(samples.length - offset, BATCH_SAMPLES - this.filled);
      this.batch.set(samples.subarray(offset, offset + count), this.filled);
      this.filled += count;
      offset += count;
      if (this.filled === BATCH_SAMPLES) {
        this.port.postMessage(this.batch, [this.batch.buffer]);
        this.batch = new Float32Array(BATCH_SAMPLES);
        this.filled = 0;
      }
    }
  }
}

registerProcessor("pcm-capture", PcmCaptureProcessor);
