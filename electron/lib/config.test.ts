import { describe, expect, it } from "vitest";
import { DEFAULT_VOICESTUDIO_URL, readVoiceStudioConfig } from "@main/lib/config";

describe("readVoiceStudioConfig", () => {
  it("defaults to the loopback backend with no key", () => {
    expect(readVoiceStudioConfig({})).toEqual({ baseUrl: DEFAULT_VOICESTUDIO_URL, apiKey: null });
  });

  it("uses a valid override without its trailing slash", () => {
    expect(readVoiceStudioConfig({ VOICESTUDIO_URL: "http://gpu-box:3900/", OMNIVOICE_API_KEY: " k " })).toEqual({
      baseUrl: "http://gpu-box:3900",
      apiKey: "k",
    });
  });

  it("ignores anything that is not an http(s) URL", () => {
    expect(readVoiceStudioConfig({ VOICESTUDIO_URL: "file:///etc/passwd" }).baseUrl).toBe(DEFAULT_VOICESTUDIO_URL);
  });
});
