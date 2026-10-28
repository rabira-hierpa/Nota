import { audioConstraints } from "@/features/transcriber/lib/microphones";
import { TARGET_SAMPLE_RATE } from "@/features/transcriber/lib/to-mono-wav";
import type { Microphone } from "@/features/transcriber/types/microphone";

/** Served from public/; posts ~100 ms batches of samples from the audio thread. */
const WORKLET_URL = "/worklets/pcm-capture.js";
const PROCESSOR_NAME = "pcm-capture";

export interface PcmCapture {
  /** The device's name, for a "no sound came from …" message. */
  label: string | null;
  stop: () => Promise<void>;
}

/**
 * Opens the microphone as a live stream of 16 kHz mono samples (Chromium
 * resamples to the context's rate). Dictation needs the audio as it arrives;
 * MediaRecorder only hands it over compressed.
 */
export async function startPcmCapture(
  microphone: Microphone | null,
  onSamples: (samples: Float32Array) => void,
): Promise<PcmCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(microphone) });
  const context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  const release = async () => {
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
  };

  try {
    await context.audioWorklet.addModule(WORKLET_URL);
    await context.resume();
  } catch (error) {
    await release();
    throw error;
  }
  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, PROCESSOR_NAME, { numberOfOutputs: 0 });
  node.port.onmessage = (event: MessageEvent<Float32Array>) => onSamples(event.data);
  source.connect(node);

  return {
    label: microphone?.label ?? stream.getAudioTracks()[0]?.label ?? null,
    stop: async () => {
      node.port.onmessage = null;
      source.disconnect();
      await release();
    },
  };
}
