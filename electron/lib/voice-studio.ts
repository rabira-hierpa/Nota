import { z } from "zod";
import { cleanTranscript } from "@main/lib/clean-transcript";
import type { VoiceStudioConfig } from "@main/lib/config";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import type { EngineStatus } from "@shared/types/engine";
import type { Result } from "@shared/types/result";

/** ISO 639-1 code VoiceStudio passes to the active ASR engine. */
const AMHARIC = "am";
/** OpenAI model ids mean "whichever ASR engine VoiceStudio has active". */
const ACTIVE_ENGINE_MODEL = "whisper-1";
const STATUS_TIMEOUT_MS = 2_000;
/** First use loads model weights, which can take minutes on CPU. */
const TRANSCRIBE_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_ENGINE_MESSAGE_LENGTH = 300;

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_CONFLICT = 409;
const HTTP_GATEWAY_TIMEOUT = 504;

export const ENGINE_MESSAGES = {
  notRunning: "VoiceStudio isn't running. Open VoiceStudio, wait for its engine to start, then try again.",
  timedOut: "VoiceStudio took too long to answer. Try a shorter recording.",
  noModel: "VoiceStudio has no speech-recognition model installed. Install one in its Model Catalogue.",
  badKey: "VoiceStudio rejected the API key. Check OMNIVOICE_API_KEY.",
  licence:
    "VoiceStudio needs you to accept this speech model's licence first. In VoiceStudio, open Model Catalogue, accept it, then press Transcribe again.",
  unexpected: "VoiceStudio sent a response this app doesn't understand.",
} as const;

/** VoiceStudio refuses a model until its licence is accepted in the app (HTTP 403). */
const LICENCE_REQUIRED_CODE = "model_licence_required";

const transcriptionResponseSchema = z.object({ text: z.string() });


// /v1 routes answer in OpenAI's error shape; other routes use FastAPI's.
const errorResponseSchema = z.object({
  error: z.object({ message: z.string(), code: z.string().nullish() }).optional(),
  detail: z.union([z.string(), z.object({ message: z.string(), code: z.string().nullish() })]).optional(),
});
type ErrorResponse = z.infer<typeof errorResponseSchema>;

/** Client for VoiceStudio's OpenAI-compatible local speech API. */
export class VoiceStudioClient implements TranscriptionEngine {
  constructor(
    private readonly config: VoiceStudioConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async status(): Promise<EngineStatus> {
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}/.well-known/voicestudio-speech`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      });
      return response.ok
        ? { kind: "online", engine: "voicestudio" }
        : { kind: "offline", engine: "voicestudio", reason: `VoiceStudio answered with HTTP ${response.status}.` };
    } catch {
      return { kind: "offline", engine: "voicestudio", reason: ENGINE_MESSAGES.notRunning };
    }
  }

  async transcribe(audio: Uint8Array, fileName: string): Promise<Result<string>> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), fileName);
    form.append("model", ACTIVE_ENGINE_MODEL);
    form.append("language", AMHARIC);
    form.append("response_format", "json");

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.baseUrl}/v1/audio/transcriptions`, {
        method: "POST",
        body: form,
        headers: this.headers(),
        signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return { success: false, error: timedOut ? ENGINE_MESSAGES.timedOut : ENGINE_MESSAGES.notRunning };
    }

    if (!response.ok) {
      return { success: false, error: await describeFailure(response) };
    }
    const body = transcriptionResponseSchema.safeParse(await response.json().catch(() => null));
    return body.success
      ? { success: true, data: cleanTranscript(body.data.text) }
      : { success: false, error: ENGINE_MESSAGES.unexpected };
  }

  private headers(): Record<string, string> {
    return this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {};
  }
}

async function describeFailure(response: Response): Promise<string> {
  const parsed = errorResponseSchema.safeParse(await response.json().catch(() => null));
  const body = parsed.success ? parsed.data : null;

  // The error code is more specific than the status: a 403 is also what a
  // model whose licence hasn't been accepted returns, not only a bad key.
  if (body && engineErrorCode(body) === LICENCE_REQUIRED_CODE) return ENGINE_MESSAGES.licence;
  if (response.status === HTTP_CONFLICT) return ENGINE_MESSAGES.noModel;
  if (response.status === HTTP_UNAUTHORIZED || response.status === HTTP_FORBIDDEN) {
    return ENGINE_MESSAGES.badKey;
  }
  if (response.status === HTTP_GATEWAY_TIMEOUT) return ENGINE_MESSAGES.timedOut;

  const message = body ? engineMessage(body) : null;
  const prefix = `VoiceStudio couldn't transcribe this recording (HTTP ${response.status})`;
  return message ? `${prefix}: ${message.slice(0, MAX_ENGINE_MESSAGE_LENGTH)}` : `${prefix}.`;
}

function engineErrorCode(body: ErrorResponse): string | null {
  if (body.error?.code) return body.error.code;
  return typeof body.detail === "object" ? (body.detail.code ?? null) : null;
}

function engineMessage(body: ErrorResponse): string | null {
  if (body.error) return body.error.message;
  if (typeof body.detail === "string") return body.detail;
  return body.detail?.message ?? null;
}
