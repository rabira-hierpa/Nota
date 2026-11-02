/** What scripts/build_speech_models.py puts in models/ (resources/models when packaged). */
export const MODEL_FILES = {
  hohe: "hohe-w8.onnx",
  hoheTokens: "hohe.json",
  punctuation: "punct-w8.onnx",
  punctuationConfig: "punct.json",
} as const;
