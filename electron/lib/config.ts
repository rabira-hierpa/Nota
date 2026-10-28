import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { ModelId } from "@shared/types/engine";

export const DEFAULT_VOICESTUDIO_URL = "http://127.0.0.1:3900";

export type LocalModelId = Exclude<ModelId, "voicestudio">;

interface LocalModelSpec {
  /** Built by scripts/setup-amharic-model.sh in the app's user-data directory; keep in step with it. */
  folder: string;
  dirEnv: string;
  /** Present once the setup script has finished. */
  requiredFiles: readonly string[];
}

/** The pinned revisions the setup script prepares. */
export const LOCAL_MODELS: Record<LocalModelId, LocalModelSpec> = {
  hohe: {
    folder: "hohe-asr-amharic-217712d",
    dirEnv: "HOHE_MODEL_DIR",
    requiredFiles: ["model.safetensors", "preprocessor_config.json", "vocab.json"],
  },
  buzzasr: {
    folder: "BuzzASR-amharic-3002b3f",
    dirEnv: "BUZZASR_MODEL_DIR",
    requiredFiles: ["model.safetensors", "generation_config.json"],
  },
};

/** VoiceStudio installs its Python runtime here on macOS; the helper reuses it. */
const VOICESTUDIO_PYTHON = path.join(
  os.homedir(),
  "Library/Application Support/VoiceStudio/runtime/project/.venv/bin/python",
);

export interface LocalModelConfig {
  model: LocalModelId;
  python: string;
  script: string;
  modelDir: string;
  requiredFiles: readonly string[];
}

export interface VoiceStudioConfig {
  baseUrl: string;
  /** Bearer key for a remote VoiceStudio; loopback needs none. */
  apiKey: string | null;
}

type Env = Readonly<Record<string, string | undefined>>;

const urlSchema = z.url({ protocol: /^https?$/ });

/** Main process only — the renderer never sees these values. */
export function readVoiceStudioConfig(env: Env = process.env): VoiceStudioConfig {
  const url = urlSchema.safeParse(env.VOICESTUDIO_URL?.trim());
  const apiKey = env.OMNIVOICE_API_KEY?.trim();
  return {
    baseUrl: (url.success ? url.data : DEFAULT_VOICESTUDIO_URL).replace(/\/+$/, ""),
    apiKey: apiKey ? apiKey : null,
  };
}

/**
 * The local Amharic models, the faster one first: stock Whisper (VoiceStudio's
 * engine) can't transcribe Amharic. STT_ENGINE=voicestudio offers VoiceStudio
 * alone instead.
 */
export function readAvailableModels(env: Env = process.env): ModelId[] {
  return env.STT_ENGINE?.trim() === "voicestudio" ? ["voicestudio"] : ["hohe", "buzzasr"];
}

export function readLocalModelConfig(
  model: LocalModelId,
  places: { userData: string; helperDir: string },
  env: Env = process.env,
): LocalModelConfig {
  const spec = LOCAL_MODELS[model];
  return {
    model,
    python: env.VOICESTUDIO_PYTHON?.trim() || VOICESTUDIO_PYTHON,
    script: path.join(places.helperDir, "amharic_transcriber.py"),
    modelDir: env[spec.dirEnv]?.trim() || path.join(places.userData, "models", spec.folder),
    requiredFiles: spec.requiredFiles,
  };
}
