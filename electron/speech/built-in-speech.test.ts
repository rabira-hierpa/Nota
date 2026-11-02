import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findBuiltInSpeech, runtimeBinding } from "@main/speech/built-in-speech";
import type { SpeechPlaces } from "@main/speech/built-in-speech";
import { MODEL_FILES } from "@main/speech/model-files";

const MODELS = "/app/models";
const NODE_MODULES = "/app/node_modules";

function places(overrides: Partial<SpeechPlaces> = {}, missing: readonly string[] = []): SpeechPlaces {
  return {
    modelsDir: MODELS,
    nodeModulesDir: NODE_MODULES,
    platform: "darwin",
    arch: "arm64",
    osRelease: "25.3.0",
    exists: (file) => !missing.some((name) => file.endsWith(name)),
    env: {},
    ...overrides,
  };
}

describe("findBuiltInSpeech", () => {
  it("finds the models where the files and ONNX Runtime are there", () => {
    expect(findBuiltInSpeech(places())).toBe(MODELS);
    expect(findBuiltInSpeech(places({ platform: "win32", arch: "x64", osRelease: "10.0.22631" }))).toBe(MODELS);
  });

  it("leaves Hohe to the Python setup before macOS 14", () => {
    expect(findBuiltInSpeech(places({ osRelease: "22.6.0" }))).toBeNull();
  });

  it("has no built-in Hohe without ONNX Runtime for this system (Intel Macs)", () => {
    expect(findBuiltInSpeech(places({ arch: "x64" }, ["darwin/x64/onnxruntime_binding.node"]))).toBeNull();
  });

  it("needs every model file", () => {
    for (const file of Object.values(MODEL_FILES)) expect(findBuiltInSpeech(places({}, [file]))).toBeNull();
  });

  it("can be turned off", () => {
    expect(findBuiltInSpeech(places({ env: { NOTA_BUILT_IN_SPEECH: "off" } }))).toBeNull();
  });
});

describe("runtimeBinding", () => {
  // Catches an onnxruntime-node upgrade that moves its binding: Hohe would quietly fall back to Python.
  it.skipIf(process.platform !== "darwin" || process.arch !== "arm64")("is where the installed package keeps it", () => {
    const nodeModules = path.join(import.meta.dirname, "..", "..", "node_modules");
    expect(existsSync(runtimeBinding(nodeModules, process.platform, process.arch))).toBe(true);
  });
});
