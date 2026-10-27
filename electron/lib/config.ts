import { z } from "zod";

export const DEFAULT_VOICESTUDIO_URL = "http://127.0.0.1:3900";

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
