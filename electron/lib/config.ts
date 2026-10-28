import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { EngineName } from "@shared/types/engine";

export const DEFAULT_VOICESTUDIO_URL = "http://127.0.0.1:3900";

/**
 * Folder built by scripts/setup-amharic-model.sh inside the app's user-data
 * directory: the pinned BuzzASR/amharic revision with a corrected generation
 * config. Keep the name in step with that script.
 */
export const AMHARIC_MODEL_FOLDER = "BuzzASR-amharic-3002b3f";
/** VoiceStudio installs its Python runtime here on macOS; the helper reuses it. */
const VOICESTUDIO_PYTHON = path.join(
  os.homedir(),
  "Library/Application Support/VoiceStudio/runtime/project/.venv/bin/python",
);

export interface AmharicModelConfig {
  python: string;
  script: string;
  modelDir: string;
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
 * The Amharic model is the default: stock Whisper (VoiceStudio's engine)
 * can't transcribe Amharic. STT_ENGINE=voicestudio opts back in.
 */
export function readEngineChoice(env: Env = process.env): EngineName {
  return env.STT_ENGINE?.trim() === "voicestudio" ? "voicestudio" : "amharic-model";
}

export function readAmharicModelConfig(
  places: { userData: string; helperDir: string },
  env: Env = process.env,
): AmharicModelConfig {
  return {
    python: env.VOICESTUDIO_PYTHON?.trim() || VOICESTUDIO_PYTHON,
    script: path.join(places.helperDir, "amharic_transcriber.py"),
    modelDir: env.AMHARIC_MODEL_DIR?.trim() || path.join(places.userData, "models", AMHARIC_MODEL_FOLDER),
  };
}
