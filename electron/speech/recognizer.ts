import { readFile } from "node:fs/promises";
import path from "node:path";
import type * as Ort from "onnxruntime-node";
import type { z } from "zod";
import { bestTokens, ctcVocabularySchema, decodeCtc } from "@main/speech/ctc";
import type { CtcVocabulary } from "@main/speech/ctc";
import { FEATURE_SIZE, hoheFeatures, MIN_SAMPLES } from "@main/speech/features";
import { MODEL_FILES } from "@main/speech/model-files";
import { punctuate, punctuationConfigSchema } from "@main/speech/punctuate";
import type { PunctuationConfig, WindowLabels } from "@main/speech/punctuate";
import { UnigramTokenizer } from "@main/speech/sentencepiece";
import { splitAtPauses } from "@main/speech/split-at-pauses";

type OnnxRuntime = typeof Ort;

const SESSION_OPTIONS: Ort.InferenceSession.SessionOptions = {
  executionProviders: ["cpu"],
  graphOptimizationLevel: "all",
  // Off, although under Electron's allocator it is about 30% slower: the arena
  // doubles each block it adds, and Electron's allocator ends the process when
  // asked for one over 2 GB (after a few long pieces). Off, memory also falls
  // back to the model's 0.9 GB between pieces.
  enableCpuMemArena: false,
};

async function readJson<T extends z.ZodType>(file: string, schema: T): Promise<z.infer<T>> {
  return schema.parse(JSON.parse(await readFile(file, "utf8")));
}

function numbers(tensor: Ort.Tensor | undefined): number[] {
  const data = tensor?.data;
  if (data instanceof BigInt64Array || data instanceof Uint8Array || data instanceof Int32Array) {
    return Array.from(data, Number);
  }
  throw new Error(`unexpected output type ${tensor?.type ?? "none"}`);
}

/** Hohe: audio in, Amharic text out (no punctuation; it writes none). */
export class Hohe {
  private constructor(
    private readonly ort: OnnxRuntime,
    private readonly session: Ort.InferenceSession,
    private readonly vocabulary: CtcVocabulary,
  ) {}

  static async load(ort: OnnxRuntime, modelsDir: string): Promise<Hohe> {
    const vocabulary = await readJson(path.join(modelsDir, MODEL_FILES.hoheTokens), ctcVocabularySchema);
    const session = await ort.InferenceSession.create(path.join(modelsDir, MODEL_FILES.hohe), SESSION_OPTIONS);
    return new Hohe(ort, session, vocabulary);
  }

  /** The text of 16 kHz samples, piece by piece (at most 30 s each), as the Python helper reads them. */
  async transcribe(samples: Int16Array): Promise<string> {
    const texts: string[] = [];
    for (const piece of splitAtPauses(samples)) {
      if (piece.length < MIN_SAMPLES) continue;
      const text = await this.transcribePiece(piece);
      if (text) texts.push(text);
    }
    return texts.join(" ");
  }

  release(): Promise<void> {
    return this.session.release();
  }

  private async transcribePiece(piece: Int16Array): Promise<string> {
    const { data, steps } = hoheFeatures(piece);
    const input = new this.ort.Tensor("float32", data, [1, steps, FEATURE_SIZE]);
    const { logits } = await this.session.run({ input_features: input });
    if (!(logits?.data instanceof Float32Array) || logits.dims.length !== 3) throw new Error("unexpected logits");
    const [, outSteps, size] = logits.dims;
    return decodeCtc(bestTokens(logits.data, outSteps, size), this.vocabulary);
  }
}

/** Puts sentence ends back into Hohe's text. */
export class Punctuator {
  private constructor(
    private readonly ort: OnnxRuntime,
    private readonly session: Ort.InferenceSession,
    private readonly config: PunctuationConfig,
    private readonly tokenizer: UnigramTokenizer,
  ) {}

  static async load(ort: OnnxRuntime, modelsDir: string): Promise<Punctuator> {
    const config = await readJson(path.join(modelsDir, MODEL_FILES.punctuationConfig), punctuationConfigSchema);
    const session = await ort.InferenceSession.create(path.join(modelsDir, MODEL_FILES.punctuation), SESSION_OPTIONS);
    return new Punctuator(ort, session, config, new UnigramTokenizer(config));
  }

  punctuate(text: string): Promise<string> {
    return punctuate(text, this.tokenizer, this.config, (ids) => this.run(ids));
  }

  release(): Promise<void> {
    return this.session.release();
  }

  private async run(ids: readonly number[]): Promise<WindowLabels> {
    const input = new this.ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]);
    const outputs = await this.session.run({ input_ids: input });
    return { post: numbers(outputs.post_preds), seg: numbers(outputs.seg_preds) };
  }
}
