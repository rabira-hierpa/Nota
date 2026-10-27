import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // node, not jsdom — almost every test here is a pure function or a
    // main-process module. A component test opts in per file with a
    // `// @vitest-environment jsdom` docblock.
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "electron/**/*.test.ts",
      "shared/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@main": path.resolve(import.meta.dirname, "./electron"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
