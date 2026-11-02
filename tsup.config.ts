import { defineConfig } from "tsup";

// Bundles the Electron main process, the preload script and the speech worker
// (a utility process). esbuild resolves the @main/ and @shared/ aliases from
// tsconfig.json, so each entry ships as a single self-contained CommonJS file
// (the sandboxed preload cannot require local modules at runtime). The one
// exception is onnxruntime-node, a native module: it ships beside the app
// (extraResources) and the worker loads it from there.
export default defineConfig({
  entry: {
    main: "electron/main.ts",
    preload: "electron/preload.ts",
    "speech-worker": "electron/speech/speech-worker.ts",
  },
  outDir: "dist-electron",
  format: ["cjs"],
  platform: "node",
  target: "node22",
  external: ["electron", "onnxruntime-node"],
  noExternal: ["zod"],
  sourcemap: true,
  clean: true,
});
