import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import { startFakeVoiceStudio } from "./fake-voice-studio";

const AMHARIC_TRANSCRIPT = "ሰላም ዓለም፣ እንዴት ነህ?";
const EDITED_TRANSCRIPT = "ሰላም ዓለም፣ እንዴት ናችሁ?";
const RECORD_MS = 1500;

let userData: string;

test.beforeEach(async () => {
  userData = await mkdtemp(path.join(tmpdir(), "stt-e2e-"));
});

test.afterEach(() => rm(userData, { recursive: true, force: true }));

/** Launches the built app with Chromium's fake microphone (a steady tone). */
async function launch(voiceStudioUrl: string): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [".", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    env: { ...process.env, VOICESTUDIO_URL: voiceStudioUrl, STT_USER_DATA_DIR: userData },
  });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1120, height: 740 });
  return { app, page };
}

async function record(page: Page): Promise<void> {
  await page.getByRole("button", { name: "New recording" }).click();
  const stop = page.getByRole("button", { name: /Stop/ });
  await expect(stop).toBeVisible();
  await page.waitForTimeout(RECORD_MS);
  await stop.click();
}

test("records, transcribes into Amharic, edits, plays back and remembers it", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);

  await expect(page.getByText("VoiceStudio connected")).toBeVisible();
  await expect(page.getByText("Speak, then read it back in Amharic")).toBeVisible();
  await page.screenshot({ path: "test-results/01-empty.png" });

  await record(page);

  const editor = page.getByLabel("Amharic transcript");
  await expect(editor).toHaveValue(AMHARIC_TRANSCRIPT);
  expect(engine.requests).toHaveLength(1);
  expect(engine.requests[0]).toMatch(/name="language"\r\n\r\nam\r\n/);
  expect(engine.requests[0]).toMatch(/Content-Type: audio\/wav[\s\S]*RIFF/);

  // Noto Sans Ethiopic is what actually renders the Ge'ez script.
  expect(await editor.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/Noto.Sans.Ethiopic/i);
  const loadedEthiopicFaces = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((face) => /Noto.Sans.Ethiopic/i.test(face.family) && face.status === "loaded")
      .length;
  });
  expect(loadedEthiopicFaces).toBeGreaterThan(0);

  await editor.fill(EDITED_TRANSCRIPT);
  await editor.blur();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Recordings" }).getByText(EDITED_TRANSCRIPT)).toBeVisible();

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.screenshot({ path: "test-results/02-transcribed.png" });
  await page.getByRole("button", { name: "Pause" }).click();

  await app.close();
  const relaunched = await launch(engine.url);
  await expect(relaunched.page.getByLabel("Amharic transcript")).toHaveValue(EDITED_TRANSCRIPT);
  await relaunched.app.close();
  await engine.close();
});

test("keeps the recording and explains what to do when VoiceStudio is off", async () => {
  const { app, page } = await launch("http://127.0.0.1:9");

  await expect(page.getByText("VoiceStudio offline")).toBeVisible();
  await record(page);

  await expect(page.getByRole("main").getByRole("alert")).toContainText("VoiceStudio isn't running");
  await expect(page.getByText("Failed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
  await page.screenshot({ path: "test-results/03-offline.png" });
  await app.close();
});
