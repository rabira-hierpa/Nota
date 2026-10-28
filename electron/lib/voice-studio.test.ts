import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { ENGINE_MESSAGES, VoiceStudioClient } from "@main/lib/voice-studio";

type Handler = (request: IncomingMessage, body: Buffer, response: ServerResponse) => void;

let server: Server | null = null;

async function startEngine(handler: Handler): Promise<string> {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => handler(request, Buffer.concat(chunks), response));
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function json(response: ServerResponse, status: number, body: object): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const wav = new Uint8Array(64).fill(1);

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
});

describe("transcribe", () => {
  it("posts the WAV as Amharic to the OpenAI-compatible endpoint", async () => {
    let seen = { path: "", body: "", auth: "" };
    const url = await startEngine((request, body, response) => {
      seen = { path: request.url ?? "", body: body.toString("latin1"), auth: request.headers.authorization ?? "" };
      json(response, 200, { text: "  ሰላም ዓለም  " });
    });

    const result = await new VoiceStudioClient({ baseUrl: url, apiKey: "secret" }).transcribe(wav, "a.wav");

    expect(result).toEqual({ success: true, data: "ሰላም ዓለም" });
    expect(seen.path).toBe("/v1/audio/transcriptions");
    expect(seen.body).toMatch(/name="language"\r\n\r\nam\r\n/);
    expect(seen.body).toMatch(/name="file"; filename="a.wav"/);
    expect(seen.auth).toBe("Bearer secret");
  });

  it("explains a missing ASR model (409) with what to install", async () => {
    const url = await startEngine((_request, _body, response) =>
      json(response, 409, { error: { message: "no model", type: "invalid_request_error" } }),
    );
    const result = await new VoiceStudioClient({ baseUrl: url, apiKey: null }).transcribe(wav, "a.wav");
    expect(result).toEqual({ success: false, error: ENGINE_MESSAGES.noModel });
  });

  it("asks for the model licence instead of blaming the API key (403 model_licence_required)", async () => {
    // The body VoiceStudio 0.5.7 sent for a fine-tune whose licence wasn't accepted yet.
    const url = await startEngine((_request, _body, response) =>
      json(response, 403, {
        error: {
          message: "Licence not accepted for BuzzASR/amharic. Review and accept it in Model Catalogue.",
          type: "permission_error",
          param: "model",
          code: "model_licence_required",
        },
      }),
    );
    const result = await new VoiceStudioClient({ baseUrl: url, apiKey: null }).transcribe(wav, "a.wav");
    expect(result).toEqual({ success: false, error: ENGINE_MESSAGES.licence });
  });

  it("still reports a rejected key for a plain 403", async () => {
    const url = await startEngine((_request, _body, response) =>
      json(response, 403, { error: { message: "Forbidden", type: "permission_error" } }),
    );
    const result = await new VoiceStudioClient({ baseUrl: url, apiKey: "wrong" }).transcribe(wav, "a.wav");
    expect(result).toEqual({ success: false, error: ENGINE_MESSAGES.badKey });
  });

  it("passes the engine's own message through for other failures", async () => {
    const url = await startEngine((_request, _body, response) =>
      json(response, 400, { error: { message: "engine 'x' is not active" } }),
    );
    const result = await new VoiceStudioClient({ baseUrl: url, apiKey: null }).transcribe(wav, "a.wav");
    expect(result).toEqual({
      success: false,
      error: "VoiceStudio couldn't transcribe this recording (HTTP 400): engine 'x' is not active",
    });
  });

  it("says VoiceStudio isn't running when nothing listens", async () => {
    const url = await startEngine(() => undefined);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = null;
    const result = await new VoiceStudioClient({ baseUrl: url, apiKey: null }).transcribe(wav, "a.wav");
    expect(result).toEqual({ success: false, error: ENGINE_MESSAGES.notRunning });
  });

  it("rejects a response without text", async () => {
    const url = await startEngine((_request, _body, response) => json(response, 200, { nope: true }));
    const result = await new VoiceStudioClient({ baseUrl: url, apiKey: null }).transcribe(wav, "a.wav");
    expect(result).toEqual({ success: false, error: ENGINE_MESSAGES.unexpected });
  });
});

describe("status", () => {
  it("is online when the capability document answers", async () => {
    const url = await startEngine((request, _body, response) =>
      request.url === "/.well-known/voicestudio-speech"
        ? json(response, 200, { protocol: "voicestudio.speech.v1" })
        : json(response, 404, {}),
    );
    expect(await new VoiceStudioClient({ baseUrl: url, apiKey: null }).status()).toEqual({ kind: "online" });
  });

  it("is offline when nothing listens", async () => {
    const client = new VoiceStudioClient({ baseUrl: "http://127.0.0.1:9", apiKey: null });
    expect(await client.status()).toMatchObject({ kind: "offline", reason: ENGINE_MESSAGES.notRunning });
  });
});
