import { defineConfig } from "@playwright/test";

// Drives the built Electron app (`npm run build` first; `npm run test:e2e`
// does both). See e2e/transcribe.spec.ts.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: "test-results",
});
