import type { ModelId } from "@shared/types/engine";

interface ModelLabels {
  /** Short name, e.g. beside a transcript. */
  name: string;
  /** What the model picker shows. */
  option: string;
  online: string;
  offline: string;
}

export const MODEL_LABELS: Record<ModelId, ModelLabels> = {
  hohe: {
    name: "Hohe",
    option: "Hohe · fast (wav2vec2-BERT)",
    online: "Hohe ready",
    offline: "Hohe not set up",
  },
  buzzasr: {
    name: "BuzzASR",
    option: "BuzzASR · Whisper large-v3",
    online: "BuzzASR ready",
    offline: "BuzzASR not set up",
  },
  voicestudio: {
    name: "VoiceStudio",
    option: "VoiceStudio",
    online: "VoiceStudio connected",
    offline: "VoiceStudio offline",
  },
};
