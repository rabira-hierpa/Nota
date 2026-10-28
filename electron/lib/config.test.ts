import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  DEFAULT_VOICESTUDIO_URL,
  LOCAL_MODELS,
  readAvailableModels,
  readLocalModelConfig,
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

describe("readAvailableModels", () => {
  it("offers the local Amharic models, fastest first, unless VoiceStudio is asked for", () => {
    expect(readAvailableModels({})).toEqual(["hohe", "buzzasr"]);
    expect(readAvailableModels({ STT_ENGINE: "something-else" })).toEqual(["hohe", "buzzasr"]);
    expect(readAvailableModels({ STT_ENGINE: " voicestudio " })).toEqual(["voicestudio"]);
  });
});

describe("readLocalModelConfig", () => {
  const places = { userData: "/data", helperDir: "/app/python" };

  it("finds the helper beside the app and each model in user data", () => {
    const hohe = readLocalModelConfig("hohe", places, {});
    expect(hohe.script).toBe(path.join("/app/python", "amharic_transcriber.py"));
    expect(hohe.modelDir).toBe(path.join("/data", "models", LOCAL_MODELS.hohe.folder));
    expect(hohe.python).toMatch(/VoiceStudio\/runtime\/project\/\.venv\/bin\/python$/);
    expect(readLocalModelConfig("buzzasr", places, {}).modelDir).toBe(
      path.join("/data", "models", LOCAL_MODELS.buzzasr.folder),
    );
  });

  it("honours overrides per model", () => {
    const env = { VOICESTUDIO_PYTHON: "/py", HOHE_MODEL_DIR: "/hohe", BUZZASR_MODEL_DIR: "/buzz" };
    expect(readLocalModelConfig("hohe", places, env)).toMatchObject({ python: "/py", modelDir: "/hohe" });
    expect(readLocalModelConfig("buzzasr", places, env).modelDir).toBe("/buzz");
  });
});
