import path from "node:path";
import { MODEL_FILES } from "@main/speech/model-files";

/** Darwin 23 is macOS 14, the oldest onnxruntime-node's Mac build runs on. */
const MIN_DARWIN_MAJOR = 23;

export interface SpeechPlaces {
  /** models/ in the repo, resources/models when packaged. */
  modelsDir: string;
  /** Where onnxruntime-node is: the repo's node_modules, or resources/node_modules when packaged. */
  nodeModulesDir: string;
  platform: NodeJS.Platform;
  arch: string;
  /** os.release(): the kernel version, Darwin's on a Mac. */
  osRelease: string;
  exists: (file: string) => boolean;
  /** NOTA_BUILT_IN_SPEECH=off uses the Python setup instead, as on a Mac it can't run on. */
  env: Readonly<Record<string, string | undefined>>;
}

/** onnxruntime-node's native binding for a system, where the package puts it. */
export function runtimeBinding(nodeModulesDir: string, platform: NodeJS.Platform, arch: string): string {
  return path.join(nodeModulesDir, "onnxruntime-node", "bin", "napi-v6", platform, arch, "onnxruntime_binding.node");
}

/**
 * The folder of the built-in speech models if this computer can run them:
 * the files are there (packaging leaves them out where they can't run) and
 * so is ONNX Runtime for this system. Null means only the Python setup can
 * run Hohe here, if anything can.
 */
export function findBuiltInSpeech(places: SpeechPlaces): string | null {
  if (places.env.NOTA_BUILT_IN_SPEECH?.trim() === "off") return null;
  if (places.platform === "darwin" && Number.parseInt(places.osRelease, 10) < MIN_DARWIN_MAJOR) return null;
  if (!places.exists(runtimeBinding(places.nodeModulesDir, places.platform, places.arch))) return null;
  const complete = Object.values(MODEL_FILES).every((file) => places.exists(path.join(places.modelsDir, file)));
  return complete ? places.modelsDir : null;
}
