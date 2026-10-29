import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";
import type { ElectronApplication, Locator, Page } from "@playwright/test";
import { startFakeVoiceStudio } from "./fake-voice-studio";
import { speakInPhrases } from "./phrases-microphone";
import { silentWav, toneWav } from "./silent-wav";

const AMHARIC_TRANSCRIPT = "ሰላም ዓለም፣ እንዴት ነህ?";
const RECORD_MS = 1500;

let userData: string;

test.beforeEach(async () => {
  userData = await mkdtemp(path.join(tmpdir(), "nota-e2e-"));
});

test.afterEach(() => rm(userData, { recursive: true, force: true }));

/** Launches the built app with Chromium's fake microphone (a steady tone unless `extraArgs` say otherwise). */
async function launch(
  voiceStudioUrl: string,
  { extraArgs = [], env = {} }: { extraArgs?: string[]; env?: Record<string, string> } = {},
): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [".", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", ...extraArgs],
    env: {
      ...process.env,
      STT_ENGINE: "voicestudio",
      VOICESTUDIO_URL: voiceStudioUrl,
      STT_USER_DATA_DIR: userData,
      // Each test starts from an empty library; the guide has a test of its own.
      NOTA_ONBOARDING: "off",
      ...env,
    },
  });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1280, height: 800 });
  return { app, page };
}

function editor(page: Page): Locator {
  return page.getByLabel("Note", { exact: true });
}

function noteList(page: Page): Locator {
  return page.getByRole("region", { name: "Notes" }).getByRole("list");
}

function library(page: Page): Locator {
  return page.getByRole("navigation", { name: "Library" });
}

/** The sidebar's sections, whatever language the interface is in. */
function sections(page: Page): Locator {
  return page.locator("[data-pane=library] nav");
}

/** A new note opens with the cursor in its title, so typing starts there. */
async function writeNote(page: Page, lines: string[]): Promise<void> {
  await page.keyboard.press("ControlOrMeta+n");
  await expect(editor(page)).toBeFocused();
  for (const [index, line] of lines.entries()) {
    if (index > 0) await page.keyboard.press("Enter");
    await page.keyboard.type(line);
  }
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
}

/** Runs an action from the note's "More actions" menu. */
async function noteAction(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "More actions" }).click();
  // Each item's name ends with its shortcut ("Archive ⌘⇧A").
  await page.getByLabel("Note actions").getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

async function record(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Record a voice note" }).click();
  const stop = page.getByRole("button", { name: "Stop recording" });
  await expect(stop).toBeVisible();
  await page.waitForTimeout(RECORD_MS);
  await stop.click();
}

test("writes, tags, favourites, finds and trashes notes, and remembers them", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await page.screenshot({ path: "test-results/01-empty.png" });

  await writeNote(page, ["የስብሰባ ማስታወሻ", "ዛሬ ከሰዓት በኋላ #ስራ/ስብሰባ"]);
  await writeNote(page, ["Shopping", "bread and coffee #home"]);

  // The newest note is on top; titles come from the first line.
  await expect(noteList(page).getByRole("button")).toHaveText([/^Shopping/, /^የስብሰባ ማስታወሻ/]);
  // Tags typed in the text become the sidebar's tag tree.
  await expect(library(page).getByRole("button", { name: /^home 1$/ })).toBeVisible();
  await library(page).getByRole("button", { name: "Expand #ስራ" }).click();
  await library(page).getByRole("button", { name: /^ስብሰባ 1$/ }).click();
  await expect(noteList(page).getByRole("button")).toHaveText([/^የስብሰባ ማስታወሻ/]);
  await expect(editor(page)).toContainText("ዛሬ ከሰዓት በኋላ");

  // Favourite it, and find it under Favorites.
  await page.getByRole("button", { name: "Add to Favorites" }).click();
  await library(page).getByRole("button", { name: /^Favorites/ }).click();
  await expect(noteList(page).getByRole("button")).toHaveText([/^የስብሰባ ማስታወሻ/]);

  // Search everything, in Amharic and by tag.
  await library(page).getByRole("button", { name: /^Notes/ }).click();
  await page.keyboard.press("ControlOrMeta+f");
  await page.keyboard.type("ከሰዓት");
  await expect(noteList(page).getByRole("button")).toHaveText([/^የስብሰባ ማስታወሻ/]);
  await expect(noteList(page).locator("mark")).toHaveText(["ከሰዓት"]);
  await page.getByLabel("Search notes").fill("#home");
  await expect(noteList(page).getByRole("button")).toHaveText([/^Shopping/]);
  await page.screenshot({ path: "test-results/02-search.png" });
  await page.getByLabel("Search notes").press("Escape");

  // Trash one, restore it, trash it again and delete it for good.
  await noteList(page).getByRole("button", { name: /^Shopping/ }).click();
  await noteAction(page, "Move to Trash");
  await expect(noteList(page).getByRole("button")).toHaveText([/^የስብሰባ ማስታወሻ/]);
  await library(page).getByRole("button", { name: /^Trash/ }).click();
  await expect(page.getByText("This note is in the Trash.")).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("The Trash is empty.")).toBeVisible();
  await library(page).getByRole("button", { name: /^Notes/ }).click();
  await noteList(page).getByRole("button", { name: /^Shopping/ }).click();
  await noteAction(page, "Move to Trash");
  await library(page).getByRole("button", { name: /^Trash/ }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Delete for good" }).click();
  await expect(page.getByText("The Trash is empty.")).toBeVisible();

  await app.close();
  const relaunched = await launch(engine.url);
  await expect(noteList(relaunched.page).getByRole("button")).toHaveText([/^የስብሰባ ማስታወሻ.*Favorite/]);
  await expect(editor(relaunched.page)).toContainText("#ስራ/ስብሰባ");
  await relaunched.app.close();
  await engine.close();
});

test("formats text and changes its font", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();

  await writeNote(page, ["Fonts", "ሰላም Hello"]);
  // The first line is the title heading; select the paragraph under it.
  await expect(editor(page).locator("h1")).toHaveText("Fonts");
  await editor(page).locator("p", { hasText: "ሰላም Hello" }).click({ clickCount: 3 });
  await page.getByLabel("Font").selectOption({ label: "Lora" });
  await page.getByRole("button", { name: "Bold (⌘B)" }).click();

  const styled = editor(page).locator('[style*="--font-lora"]');
  await expect(styled).toHaveText("ሰላም Hello");
  await expect(editor(page).locator("strong")).toHaveText("ሰላም Hello");
  // Latin in Lora; Ge'ez falls back to Noto Serif Ethiopic, so no boxes.
  expect(await styled.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/Lora.*Noto.Serif.Ethiopic/i);
  await expect(page.getByLabel("Font")).toHaveValue("lora");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/03-fonts.png" });
  await app.close();
  await engine.close();
});

test("records a voice note, transcribes it into Amharic, plays it back and remembers it", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("VoiceStudio connected")).toBeVisible();

  await record(page);

  await expect(editor(page)).toHaveText(AMHARIC_TRANSCRIPT);
  await expect(page.getByText("Transcribed", { exact: true })).toBeVisible();
  expect(engine.requests).toHaveLength(1);
  expect(engine.requests[0]).toMatch(/name="language"\r\n\r\nam\r\n/);
  expect(engine.requests[0]).toMatch(/Content-Type: audio\/wav[\s\S]*RIFF/);

  // Noto Sans Ethiopic is what actually renders the Ge'ez script.
  const title = editor(page).locator("p").first();
  expect(await title.evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(/Noto.Sans.Ethiopic/i);
  const loadedEthiopicFaces = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((face) => /Noto.Sans.Ethiopic/i.test(face.family) && face.status === "loaded")
      .length;
  });
  expect(loadedEthiopicFaces).toBeGreaterThan(0);
  await expect(library(page).getByRole("button", { name: /^Voice notes 1$/ })).toBeVisible();

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.screenshot({ path: "test-results/04-voice-note.png" });
  await page.getByRole("button", { name: "Pause" }).click();

  await app.close();
  const relaunched = await launch(engine.url);
  await expect(editor(relaunched.page)).toHaveText(AMHARIC_TRANSCRIPT);
  await relaunched.app.close();
  await engine.close();
});

test("keeps the voice note and explains what to do when VoiceStudio is off", async () => {
  const { app, page } = await launch("http://127.0.0.1:9");

  await expect(page.getByText("VoiceStudio offline")).toBeVisible();
  await record(page);

  await expect(page.getByRole("main").getByRole("alert")).toContainText("VoiceStudio isn't running");
  await expect(page.getByText("Failed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
  await page.screenshot({ path: "test-results/05-offline.png" });
  await app.close();
});

test("refuses a silent recording and names the microphone instead of transcribing nothing", async () => {
  // A virtual input like BlackHole as the system default records pure silence.
  const silence = path.join(userData, "silence.wav");
  await writeFile(silence, silentWav(3));
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url, { extraArgs: [`--use-file-for-fake-audio-capture=${silence}`] });

  await expect(page.getByLabel("Microphone")).not.toHaveValue("");
  await record(page);

  await expect(page.getByRole("region", { name: "Notes" }).getByRole("alert")).toContainText("No sound came from");
  await expect(page.getByText("No notes yet.")).toBeVisible();
  expect(engine.requests).toHaveLength(0);
  await app.close();
  await engine.close();
});

test("dictates into the open note: text appears after each pause while still speaking", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await app.context().addInitScript(speakInPhrases, { phraseSeconds: 0.9, pauseSeconds: 1.2 });
  await page.reload();
  await expect(page.getByText("VoiceStudio connected")).toBeVisible();

  await writeNote(page, ["ማስታወሻ"]);
  await page.getByRole("button", { name: "Dictate" }).click();
  const stop = page.getByRole("button", { name: /Stop dictating/ });
  await expect(stop).toBeVisible();
  await expect(page.getByRole("button", { name: "Record a voice note" })).toBeDisabled();

  await expect(editor(page)).toContainText(`ማስታወሻ ${AMHARIC_TRANSCRIPT}`, { timeout: 10_000 });
  // The text arrived while dictation was still running.
  await expect(stop).toBeVisible();
  await page.screenshot({ path: "test-results/06-dictating.png" });
  await stop.click();

  await expect(page.getByText("Transcribed", { exact: true })).toBeVisible();
  const clipRequests = engine.requests.length;
  expect(clipRequests).toBeGreaterThanOrEqual(1);
  expect(engine.requests[0]).toMatch(/filename="dictation\.wav"/);
  // The audio is kept as already transcribed: nothing is sent again.
  await page.waitForTimeout(500);
  expect(engine.requests).toHaveLength(clipRequests);
  await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
  await app.close();
  await engine.close();
});

test("moves the old app's folder to Nota and turns its recordings into notes", async () => {
  const legacy = path.join(userData, "Amharic Speech to Text");
  const recordingId = "4f0e3b4a-5f53-4a8e-9f51-0d7a1b8f6c2e";
  await mkdir(path.join(legacy, "recordings"), { recursive: true });
  await writeFile(
    path.join(legacy, "recordings", "recordings.json"),
    JSON.stringify({
      version: 1,
      recordings: [
        {
          id: recordingId,
          createdAt: "2026-10-27T19:32:00.000Z",
          durationMs: 3000,
          transcript: "ሙከራ ሙከራ አንድ ሁለት ሶስት",
          transcription: { status: "done", transcribedAt: "2026-10-27T19:33:00.000Z", model: "hohe" },
        },
      ],
    }),
  );
  await writeFile(path.join(legacy, "recordings", `${recordingId}.wav`), silentWav(3));
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url, { env: { STT_USER_DATA_DIR: "", STT_APP_DATA_DIR: userData } });

  await expect(editor(page)).toHaveText("ሙከራ ሙከራ አንድ ሁለት ሶስት");
  await expect(page.getByText("by Hohe")).toBeVisible();
  expect(await readdir(userData)).toEqual(["Nota"]);
  await app.close();
  await engine.close();
});

test("opening a note doesn't move it; only an edit does", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await writeNote(page, ["First"]);
  await writeNote(page, ["Second"]);
  const order = [/^Second/, /^First/];

  await noteList(page).getByRole("button", { name: /^First/ }).click();
  await expect(editor(page)).toContainText("First");
  await page.waitForTimeout(1000);
  await expect(noteList(page).getByRole("button")).toHaveText(order);

  await editor(page).press("End");
  await page.keyboard.type(" edited");
  await expect(noteList(page).getByRole("button")).toHaveText([/^First edited/, /^Second/]);
  await app.close();
  await engine.close();
});

test("pins, archives, sorts and links notes", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await writeNote(page, ["Zebra plans"]);
  await writeNote(page, ["Apple", "see [[Zebra plans]]"]);
  await writeNote(page, ["Middle"]);

  // Pin the oldest note: it leads the list.
  await noteList(page).getByRole("button", { name: /^Zebra plans/ }).click();
  await page.keyboard.press("ControlOrMeta+Shift+KeyP");
  await expect(noteList(page).getByRole("button").first()).toHaveText(/^Zebra plans/);
  // Sorted by title, after the pin.
  await page.getByLabel("Sort notes by").selectOption("title");
  await expect(noteList(page).getByRole("button")).toHaveText([/^Zebra plans/, /^Apple/, /^Middle/]);

  // Backlinks, and following a link with ⌘-click.
  await expect(page.getByRole("complementary", { name: "Linked from" })).toContainText("Apple");
  await page.getByRole("complementary", { name: "Linked from" }).getByRole("button", { name: "Apple" }).click();
  await editor(page).locator(".nota-link").click({ modifiers: ["ControlOrMeta"] });
  await expect(editor(page).locator("h1")).toHaveText("Zebra plans");

  // Archive: out of Notes, into the Archive.
  await noteList(page).getByRole("button", { name: /^Middle/ }).click();
  await noteAction(page, "Archive");
  await expect(noteList(page).getByRole("button")).toHaveText([/^Zebra plans/, /^Apple/]);
  await library(page).getByRole("button", { name: /^Archive/ }).click();
  await expect(noteList(page).getByRole("button")).toHaveText([/^Middle/]);
  await app.close();
  await engine.close();
});

test("locks a note with a password: sealed on disk, closed after locking, and after a relaunch", async () => {
  const secret = "የይለፍ ቃሉ ሚስጥር ነው";
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await writeNote(page, ["Diary", secret]);

  await noteAction(page, "Lock note");
  const dialog = page.getByRole("dialog", { name: "Set a password for locked notes" });
  await dialog.getByLabel("Password", { exact: true }).fill("ጠንካራ-ቃል");
  await dialog.getByLabel("Type it again").fill("ጠንካራ-ቃል");
  await dialog.getByLabel("I understand a forgotten password can't be recovered.").check();
  await dialog.getByRole("button", { name: "Set password and lock" }).click();
  // Still open for now, marked as locked; the list never shows a locked note's text.
  await expect(editor(page)).toContainText(secret);
  await expect(noteList(page).getByRole("button", { name: /^Diary/ })).toContainText("Unlocked");
  await expect(noteList(page)).not.toContainText(secret);
  const files = await readdir(path.join(userData, "notes"));
  const onDisk = await readFile(path.join(userData, "notes", files[0] ?? ""), "utf8");
  expect(onDisk).not.toContain(secret);

  // Lock everything: the note closes and asks for the password.
  await page.keyboard.press("ControlOrMeta+Alt+KeyL");
  await expect(page.getByText("This note is locked.")).toBeVisible();
  await page.getByRole("main").getByLabel("Password").fill("wrong-guess");
  await page.getByRole("button", { name: "Unlock notes" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("That password isn't right.");
  await page.getByRole("main").getByLabel("Password").fill("ጠንካራ-ቃል");
  await page.getByRole("button", { name: "Unlock notes" }).click();
  await expect(editor(page)).toContainText(secret);
  await page.screenshot({ path: "test-results/07-locked.png" });

  await app.close();
  const relaunched = await launch(engine.url);
  await expect(relaunched.page.getByText("This note is locked.")).toBeVisible();
  await relaunched.app.close();
  await engine.close();
});

test("Zen mode shows only the note, keeps Dictate, and Escape leaves it", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await writeNote(page, ["Quiet", "ጸጥ ያለ ጽሁፍ"]);

  await page.keyboard.press("ControlOrMeta+Shift+KeyF");
  await expect(library(page)).toBeHidden();
  await expect(page.getByRole("region", { name: "Notes" })).toBeHidden();
  await expect(page.getByRole("toolbar", { name: "Formatting" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Dictate" })).toBeVisible();
  await page.screenshot({ path: "test-results/08-zen.png" });

  await page.keyboard.press("Escape");
  await expect(library(page)).toBeVisible();
  await app.close();
  await engine.close();
});

test("lists the keyboard shortcuts, from Settings or ⌘/", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: /Keyboard shortcuts/ }).click();
  const shortcuts = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(shortcuts.getByRole("region", { name: "Note", exact: true })).toContainText("Lock or unlock the note");
  await expect(shortcuts.getByRole("region", { name: "View", exact: true })).toContainText("Zen mode");
  await shortcuts.getByRole("button", { name: "Close" }).click();
  await expect(shortcuts).toBeHidden();

  await page.keyboard.press("ControlOrMeta+Slash");
  await expect(shortcuts).toBeVisible();
  await app.close();
  await engine.close();
});

test("exports a note as Markdown", async () => {
  const exportDir = path.join(userData, "exports");
  await mkdir(exportDir);
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url, { env: { STT_EXPORT_DIR: exportDir } });
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await writeNote(page, ["የገበያ ዝርዝር", "ዳቦ #ቤት"]);

  await page.getByRole("button", { name: "More actions" }).click();
  await page.getByLabel("Note actions").getByRole("button", { name: "Markdown" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Exported." })).toBeVisible();
  expect(await readFile(path.join(exportDir, "የገበያ ዝርዝር.md"), "utf8")).toBe("# የገበያ ዝርዝር\n\nዳቦ #ቤት\n");
  await app.close();
  await engine.close();
});

test("shows the setup guide on a fresh install, once", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url, { env: { NOTA_ONBOARDING: "on" } });

  const guide = page.getByRole("dialog", { name: /Setup guide/ });
  await expect(guide.getByRole("heading", { name: "Welcome to Nota" })).toBeVisible();
  await guide.getByRole("button", { name: "Next" }).click();
  // This test runs on VoiceStudio, so there is nothing to download.
  await expect(guide).toContainText("set to use VoiceStudio");
  await guide.getByRole("button", { name: "4. Writing" }).click();
  await expect(guide).toContainText("==text==");
  await guide.getByRole("button", { name: "Start writing" }).click();
  await expect(guide).toBeHidden();

  // Settings can always open it again.
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: /Setup guide/ }).click();
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "Skip guide" }).click();

  await app.close();
  const relaunched = await launch(engine.url, { env: { NOTA_ONBOARDING: "on" } });
  await expect(relaunched.page.getByText("No notes yet.")).toBeVisible();
  await expect(relaunched.page.getByRole("dialog", { name: /Setup guide/ })).toBeHidden();
  await relaunched.app.close();
  await engine.close();
});

test("folds the sidebar away, brings it back, and remembers which", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  let { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  const sidebarWidth = () => page.locator("[data-pane=library]").evaluate((aside) => aside.getBoundingClientRect().width);

  await page.getByRole("button", { name: /^Hide sidebar/ }).click();
  await expect.poll(sidebarWidth).toBe(0);
  const show = page.getByRole("button", { name: /^Show sidebar/ });
  await expect(show).toBeVisible();
  await page.screenshot({ path: "test-results/11-sidebar-folded.png" });

  // Folded, it stays out of the way after a relaunch too.
  await app.close();
  ({ app, page } = await launch(engine.url));
  await expect(page.getByRole("button", { name: /^Show sidebar/ })).toBeVisible();
  await expect.poll(sidebarWidth).toBe(0);
  await page.keyboard.press("ControlOrMeta+Alt+KeyS");
  await expect.poll(sidebarWidth).toBeGreaterThan(150);
  await expect(page.getByRole("button", { name: /^Show sidebar/ })).toBeHidden();
  await app.close();
  await engine.close();
});

test("shows a note's dates in the Ethiopian calendar, and its paragraphs, words and characters", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await writeNote(page, ["ሰላም ዓለም", "ሁለተኛ መስመር እዚህ"]);

  await page.getByRole("button", { name: /5 words/ }).click();
  const info = page.getByLabel("Note info");
  await expect(info).toContainText("Created");
  await expect(info).toContainText("Paragraphs2Words5Characters21");
  await expect(info).toContainText("17 characters without spaces");
  await expect(info).not.toContainText("ዓ.ም.");
  await page.keyboard.press("Escape");

  await page.keyboard.press("ControlOrMeta+Comma");
  await page.getByText("Ethiopian", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Ethiopian" })).toBeChecked();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+Shift+KeyI");
  await expect(info).toContainText("ዓ.ም.");
  await page.screenshot({ path: "test-results/12-note-info.png" });
  await page.keyboard.press("Escape");

  // Both calendars: the Gregorian date, with the Ethiopian one under it.
  await page.keyboard.press("ControlOrMeta+Comma");
  await page.getByText("Both", { exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+Shift+KeyI");
  await expect(info).toContainText(String(new Date().getFullYear()));
  await expect(info).toContainText("ዓ.ም.");
  await app.close();
  await engine.close();
});

test("transcribes a recording made elsewhere into a new note", async () => {
  const memo = path.join(userData, "voice-memo.wav");
  await writeFile(memo, toneWav(2));
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url, { env: { NOTA_IMPORT_AUDIO: memo } });
  await expect(page.getByText("No notes yet.")).toBeVisible();

  await page.getByRole("button", { name: /^Transcribe a recording/ }).click();
  await expect(noteList(page).getByRole("button")).toHaveText([new RegExp(`^${AMHARIC_TRANSCRIPT}`)]);
  await expect(editor(page)).toHaveText(AMHARIC_TRANSCRIPT);
  await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
  expect(engine.requests).toHaveLength(1);

  // Dropping a file that isn't a recording says so.
  const notes = page.getByRole("region", { name: "Notes" });
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["%PDF"], "minutes.pdf", { type: "application/pdf" }));
    return transfer;
  });
  await notes.dispatchEvent("dragover", { dataTransfer });
  await expect(notes.getByText("Drop a recording to transcribe it")).toBeVisible();
  await notes.dispatchEvent("drop", { dataTransfer });
  await expect(notes.getByRole("alert")).toHaveText("That isn't a recording. Drop an m4a, mp3, wav, ogg or opus file.");
  await app.close();
  await engine.close();
});

test("summarizes a long transcript, splits it into paragraphs and suggests tags", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await writeNote(page, ["የቡድን ስብሰባ", "ቡድኑ ስለ መተግበሪያው ዲዛይን ተወያየ። ቀጣዩ ስብሰባ ሰኞ ነው። #ስራ/ስብሰባ"]);
  await writeNote(page, [
    "የሳምንቱ ስብሰባ",
    "ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ። መተግበሪያው የአማርኛ ድምፅን ወደ ጽሑፍ ይቀይራል። " +
      "ቡድኑ መተግበሪያውን በሚቀጥለው ወር ለመልቀቅ ወሰነ። የመተግበሪያው ዲዛይን ቀላል እና ንጹህ መሆን አለበት። " +
      "በስብሰባው ላይ የበጀት ጉዳይም ተነስቷል። በጀቱ ለሶስት ወር በቂ ነው። ተጨማሪ በጀት ለማግኘት ማመልከቻ እንጽፋለን።",
  ]);

  await page.getByRole("button", { name: "Summarize and organize" }).click();
  const panel = page.getByLabel("Summarize and organize", { exact: true }).and(page.locator("[popover]"));
  await expect(panel.getByRole("region", { name: "Summary" }).getByRole("listitem").first()).toBeVisible();
  await expect(panel.getByRole("button", { name: "#ስራ/ስብሰባ" })).toBeVisible();
  await page.screenshot({ path: "test-results/13-assist.png" });

  // Paragraphs with text: the editor keeps an empty one at the end for the cursor.
  const paragraphs = editor(page).locator("p").filter({ hasText: /\S/ });
  await panel.getByRole("button", { name: "Split into paragraphs" }).click();
  await expect(paragraphs).toHaveCount(2);
  await panel.getByRole("button", { name: "Add under the title" }).click();
  await expect(editor(page).locator("blockquote")).toContainText("ማጠቃለያ፦");
  await panel.getByRole("button", { name: "#ስራ/ስብሰባ" }).click();
  await expect(paragraphs.last()).toHaveText("#ስራ/ስብሰባ");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // The title is still the first line.
  await expect(noteList(page).getByRole("button").first()).toHaveText(/^የሳምንቱ ስብሰባ/);
  await app.close();
  await engine.close();
});

test("menus over the note's header take clicks, rather than dragging the window", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  const { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await writeNote(page, ["Menus", "ሁለተኛ መስመር"]);

  // The header is the window's drag handle. A real click on anything still
  // marked as part of it moves the window instead of reaching the page (which
  // Playwright's clicks, sent straight to the page, can't see), so every menu
  // opened from it must be marked otherwise.
  const appRegion = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).getPropertyValue("app-region"));
  const menus: [Locator, Locator][] = [
    [page.getByRole("button", { name: "More actions" }), page.getByLabel("Note actions")],
    [page.getByRole("button", { name: /words/ }), page.getByLabel("Note info")],
    [
      page.getByRole("button", { name: "Summarize and organize" }),
      page.locator('[popover][aria-label="Summarize and organize"]'),
    ],
  ];
  for (const [button, menu] of menus) {
    await button.click();
    await expect(menu).toBeVisible();
    expect(await appRegion(menu)).not.toBe("drag");
    for (const item of await menu.getByRole("button").all()) expect(await appRegion(item)).not.toBe("drag");
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  }
  await app.close();
  await engine.close();
});

test("switches the interface to Amharic, menu bar included, and remembers it", async () => {
  const engine = await startFakeVoiceStudio(AMHARIC_TRANSCRIPT);
  let { app, page } = await launch(engine.url);
  await expect(page.getByText("No notes yet.")).toBeVisible();
  const menuTitles = () =>
    app.evaluate(({ Menu }) => Menu.getApplicationMenu()?.items.map((item) => item.label) ?? []);
  expect(await menuTitles()).toContain("Edit");

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByText("አማርኛ", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "am");
  await expect(sections(page).getByRole("button", { name: /^ተወዳጆች/ })).toBeVisible();
  await expect(page.getByText("እስካሁን ማስታወሻ የለም።", { exact: false })).toBeVisible();
  await expect.poll(menuTitles).toContain("አርትዕ");
  await page.keyboard.press("Escape");

  // A note, in the Amharic interface.
  await page.keyboard.press("ControlOrMeta+n");
  await expect(page.getByLabel("ማስታወሻ", { exact: true })).toBeFocused();
  await page.keyboard.type("የገበያ ዝርዝር");
  await page.keyboard.press("Enter");
  await page.keyboard.type("ቲማቲም እና ሽንኩርት");
  await expect(page.getByText("ተቀምጧል", { exact: true })).toBeVisible();
  await expect(page.getByLabel("ማስታወሻ", { exact: true })).toHaveText("የገበያ ዝርዝርቲማቲም እና ሽንኩርት");
  await expect(page.getByRole("button", { name: "በድምፅ ጻፍ" })).toBeVisible();
  await page.getByRole("button", { name: /ቃላት/ }).click();
  await expect(page.getByLabel("የማስታወሻ መረጃ")).toContainText("የተፈጠረው");
  await page.screenshot({ path: "test-results/15-amharic-info.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "ቅንብሮች" }).click();
  await page.screenshot({ path: "test-results/14-amharic.png" });
  await page.keyboard.press("Escape");

  // Still in Amharic after a relaunch, menu bar too; and back to English.
  await app.close();
  ({ app, page } = await launch(engine.url));
  await expect(sections(page).getByRole("button", { name: /^ማስታወሻዎች/ })).toBeVisible();
  await expect.poll(menuTitles).toContain("አርትዕ");
  await page.getByRole("button", { name: "ቅንብሮች" }).click();
  await page.getByText("English", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(sections(page).getByRole("button", { name: /^Favorites/ })).toBeVisible();
  await expect.poll(menuTitles).toContain("Edit");
  await app.close();
  await engine.close();
});
