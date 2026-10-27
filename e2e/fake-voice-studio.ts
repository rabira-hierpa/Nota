import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

export interface FakeVoiceStudio {
  url: string;
  /** Raw multipart bodies of every transcription request. */
  requests: string[];
  close: () => Promise<void>;
}

/** Stands in for VoiceStudio's speech API so e2e runs need no models. */
export async function startFakeVoiceStudio(transcript: string): Promise<FakeVoiceStudio> {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      if (request.url === "/.well-known/voicestudio-speech") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ protocol: "voicestudio.speech.v1" }));
        return;
      }
      if (request.method === "POST" && request.url === "/v1/audio/transcriptions") {
        requests.push(Buffer.concat(chunks).toString("latin1"));
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ text: transcript }));
        return;
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
