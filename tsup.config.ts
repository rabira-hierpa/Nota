import { defineConfig } from "tsup";

// Bundles the Electron main process and preload script. esbuild resolves the
// @main/ and @shared/ aliases from tsconfig.json, so both entries ship as
// single self-contained CommonJS files (the sandboxed preload cannot require
// local modules at runtime).
export default defineConfig({
  entry: {
    main: "electron/main.ts",
    preload: "electron/preload.ts",
  },
  outDir: "dist-electron",
  format: ["cjs"],
  platform: "node",
  target: "node22",
  external: ["electron"],
  noExternal: ["zod"],
  sourcemap: true,
  clean: true,
});
