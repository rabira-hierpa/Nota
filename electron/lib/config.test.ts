import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  AMHARIC_MODEL_FOLDER,
  DEFAULT_VOICESTUDIO_URL,
  readAmharicModelConfig,
  readEngineChoice,
  readVoiceStudioConfig,
} from "@main/lib/config";

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

describe("readEngineChoice", () => {
  it("uses the Amharic model unless VoiceStudio is asked for", () => {
    expect(readEngineChoice({})).toBe("amharic-model");
    expect(readEngineChoice({ STT_ENGINE: "something-else" })).toBe("amharic-model");
    expect(readEngineChoice({ STT_ENGINE: " voicestudio " })).toBe("voicestudio");
  });
});

describe("readAmharicModelConfig", () => {
  const places = { userData: "/data", helperDir: "/app/python" };

  it("finds the helper beside the app and the model in user data", () => {
    const config = readAmharicModelConfig(places, {});
    expect(config.script).toBe(path.join("/app/python", "amharic_transcriber.py"));
    expect(config.modelDir).toBe(path.join("/data", "models", AMHARIC_MODEL_FOLDER));
    expect(config.python).toMatch(/VoiceStudio\/runtime\/project\/\.venv\/bin\/python$/);
  });

  it("honours overrides", () => {
    const config = readAmharicModelConfig(places, { VOICESTUDIO_PYTHON: "/py", AMHARIC_MODEL_DIR: "/model" });
    expect([config.python, config.modelDir]).toEqual(["/py", "/model"]);
  });
});
