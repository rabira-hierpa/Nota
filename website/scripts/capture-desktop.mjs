// Takes the website's desktop screenshots and the dictation clip from the built
// app, in English and Amharic, light and dark.
//
//   npm run build && node website/scripts/capture-desktop.mjs <output folder> [--clips]
//
// It runs against a throwaway data folder, so no real notes can appear. The
// notes are sample content. Transcription is the one stand-in: fake-hohe.mjs
// answers with known sentences instead of the model, because there is no real
// Amharic recording to feed it. Everything else on screen is the app itself.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "@playwright/test";

const HERE = import.meta.dirname;
const REPO = path.resolve(HERE, "../..");
const OUT = path.resolve(process.argv[2] ?? path.join(tmpdir(), "nota-shots"));
const FPS = 24;
const DAY_MS = 86_400_000;
const WINDOW = { width: 1360, height: 860 };
const CLIP_WINDOW = { width: 780, height: 520 };

const LOCALES = ["en", "am"];
const THEMES = ["light", "dark"];

const DICTATED = ["ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ", "ስለ አዲሱ መተግበሪያ ተወያየ።", "ቀጣዩ ስብሰባ ሐሙስ ነው።"];

const WORDS = {
  en: { dictate: /^Dictate/, stop: /^Stop dictating/, info: /word|note info/i, settings: "Settings" },
  am: { dictate: /^በድምፅ ጻፍ/, stop: /^በድምፅ መጻፍ አቁም/, info: /የማስታወሻ መረጃ$/, settings: "ቅንብሮች" },
};

const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const paragraph = (text) => `<p>${escapeHtml(text)}</p>`;
const task = (text, done) =>
  `<li data-type="taskItem" data-checked="${done}"><label><input type="checkbox"${done ? " checked" : ""}><span></span></label><div>${paragraph(text)}</div></li>`;
const ago = (days) => new Date(Date.now() - days * DAY_MS).toISOString();

/** A mono 16 kHz WAV that looks like speech on the player: phrases with pauses. */
function speechLikeWav(seconds) {
  const rate = 16_000;
  const samples = seconds * rate;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(36 + samples * 2, 4);
  wav.write("WAVEfmt ", 8, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i += 1) {
    const t = i / rate;
    const phrase = t % 3.1;
    const talking = phrase < 2.4 ? Math.sin((Math.PI * phrase) / 2.4) : 0;
    const level = 0.35 + 0.25 * Math.sin(t * 0.7) * Math.sin(t * 2.3);
    const value = talking * level * Math.sin(2 * Math.PI * (180 + 40 * Math.sin(t * 3)) * t);
    wav.writeInt16LE(Math.round(value * 32_767), 44 + i * 2);
  }
  return wav;
}

const VOICE_MS = 42_000;
const MEETING = "የሳምንቱ ስብሰባ ማስታወሻ";
const VOICE = "የቡድን ውይይት";

const LIBRARY = [
  {
    title: MEETING,
    favorite: true,
    edited: 0.02,
    created: 6,
    html:
      `<h1>${MEETING}</h1>` +
      paragraph("ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ። #ስራ/ስብሰባ") +
      `<p><mark>ቀጣዩ ስብሰባ ሐሙስ ነው።</mark></p>` +
      `<h2>የሚሰሩ ስራዎች</h2>` +
      `<ul data-type="taskList">${task("የበጀት ሰነዱን መላክ", true)}${task("የንድፍ ረቂቁን ማጠናቀቅ", false)}${task("ሙከራዎችን መጻፍ", false)}</ul>` +
      `<blockquote>${paragraph("ቀላል ነገሮች ይቀድማሉ።")}${paragraph("ተጨማሪ፦ [[የበጀት ዕቅድ]]")}</blockquote>`,
    text:
      `${MEETING}\nዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ። #ስራ/ስብሰባ\nቀጣዩ ስብሰባ ሐሙስ ነው።\nየሚሰሩ ስራዎች\n` +
      "የበጀት ሰነዱን መላክ\nየንድፍ ረቂቁን ማጠናቀቅ\nሙከራዎችን መጻፍ\nቀላል ነገሮች ይቀድማሉ።\nተጨማሪ፦ [[የበጀት ዕቅድ]]",
  },
  {
    title: VOICE,
    voice: true,
    edited: 1.2,
    created: 1.2,
    html:
      `<h1>${VOICE}</h1>` +
      paragraph("ዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ። መተግበሪያው የአማርኛ ድምፅን ወደ ጽሑፍ ይቀይራል። ቡድኑ መተግበሪያውን በሚቀጥለው ወር ለመልቀቅ ወሰነ።") +
      paragraph("የመተግበሪያው ዲዛይን ቀላል እና ንጹህ መሆን አለበት። በስብሰባው ላይ የበጀት ጉዳይም ተነስቷል። በጀቱ ለሶስት ወር በቂ ነው።") +
      paragraph("#ስራ/ስብሰባ"),
    text:
      `${VOICE}\nዛሬ ከሰዓት በኋላ ቡድኑ ተሰብስቦ ስለ አዲሱ መተግበሪያ ተወያየ። መተግበሪያው የአማርኛ ድምፅን ወደ ጽሑፍ ይቀይራል። ቡድኑ መተግበሪያውን በሚቀጥለው ወር ለመልቀቅ ወሰነ።\n` +
      "የመተግበሪያው ዲዛይን ቀላል እና ንጹህ መሆን አለበት። በስብሰባው ላይ የበጀት ጉዳይም ተነስቷል። በጀቱ ለሶስት ወር በቂ ነው።\n#ስራ/ስብሰባ",
  },
  { title: "የበጀት ዕቅድ", body: ["በጀቱ ለሶስት ወር በቂ ነው። ተጨማሪ በጀት ለማግኘት ማመልከቻ እንጽፋለን።", "#ስራ/በጀት"], edited: 3, created: 9 },
  { title: "የላሊበላ ጉዞ", body: ["የአውሮፕላን ትኬት፣ ሆቴል እና መመሪያ።", "#ጉዞ"], edited: 8, created: 20 },
  { title: "የንባብ ማስታወሻ", body: ["ምዕራፍ ሦስት ተጠናቀቀ። ነገ ምዕራፍ አራት።", "#ንባብ"], edited: 14, created: 30 },
  { title: "Ideas for the weekend", body: ["Visit Entoto park, try the new café early in the morning.", "#ideas"], edited: 21, created: 40 },
  { title: "የገበያ ዝርዝር", body: ["ዳቦ፣ ወተት፣ ቡና እና ቲማቲም።", "#ቤት"], edited: 27, created: 45 },
];

function noteFile(entry) {
  const body = entry.body ?? [];
  const note = {
    id: randomUUID(),
    createdAt: ago(entry.created),
    updatedAt: ago(entry.edited),
    content: entry.html ?? `<h1>${escapeHtml(entry.title)}</h1>${body.map(paragraph).join("")}`,
    text: entry.text ?? [entry.title, ...body].join("\n"),
    favorite: entry.favorite ?? false,
    pinned: false,
    archivedAt: null,
    trashedAt: null,
    audio: entry.voice
      ? { durationMs: VOICE_MS, transcription: { status: "done", transcribedAt: ago(entry.edited), model: "hohe" } }
      : null,
    lock: null,
  };
  return { id: note.id, voice: Boolean(entry.voice), json: `${JSON.stringify({ version: 1, note })}\n` };
}

/** Page init script: a speaker who pauses between phrases (as e2e/phrases-microphone.ts does). */
function speakInPhrases({ phraseSeconds, pauseSeconds }) {
  navigator.mediaDevices.getUserMedia = async () => {
    const context = new AudioContext();
    const tone = new OscillatorNode(context, { frequency: 220 });
    const gate = new GainNode(context, { gain: 0 });
    for (let start = 0; start < 240; start += phraseSeconds + pauseSeconds) {
      gate.gain.setValueAtTime(0.3, context.currentTime + start);
      gate.gain.setValueAtTime(0, context.currentTime + start + phraseSeconds);
    }
    const output = context.createMediaStreamDestination();
    tone.connect(gate).connect(output);
    tone.start();
    return output.stream;
  };
}

const scratch = await mkdtemp(path.join(tmpdir(), "nota-site-shots-"));
const userData = path.join(scratch, "user-data");
const modelDir = path.join(scratch, "hohe");
const transcripts = path.join(scratch, "transcripts.json");
await Promise.all([mkdir(path.join(userData, "notes"), { recursive: true }), mkdir(modelDir), mkdir(OUT, { recursive: true })]);
// The app checks that these files exist before it offers Hohe through Python.
for (const file of ["model.safetensors", "preprocessor_config.json", "vocab.json"]) {
  await writeFile(path.join(modelDir, file), "");
}
for (const entry of LIBRARY) {
  const { id, voice, json } = noteFile(entry);
  await writeFile(path.join(userData, "notes", `${id}.json`), json);
  if (voice) await writeFile(path.join(userData, "notes", `${id}.wav`), speechLikeWav(VOICE_MS / 1000));
}

const app = await electron.launch({
  cwd: REPO,
  args: [".", "--force-device-scale-factor=2", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  env: {
    ...process.env,
    STT_USER_DATA_DIR: userData,
    NOTA_ONBOARDING: "off",
    NOTA_BUILT_IN_SPEECH: "off",
    NOTA_PYTHON: path.join(HERE, "fake-hohe.mjs"),
    NOTA_CAPTURE_TRANSCRIPTS: transcripts,
    HOHE_MODEL_DIR: modelDir,
    BUZZASR_MODEL_DIR: path.join(scratch, "no-buzzasr"),
  },
});
const page = await app.firstWindow();
await app.context().addInitScript(speakInPhrases, { phraseSeconds: 1.1, pauseSeconds: 1.1 });

async function resize({ width, height }) {
  await app.evaluate(
    ({ BrowserWindow }, [w, h]) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.setMinimumSize(320, 320);
      win.setContentSize(w, h);
    },
    [width, height],
  );
  await page.waitForTimeout(500);
}

async function prefer({ locale, theme, calendar = "gregorian" }) {
  await page.evaluate(
    ([l, t, c]) => {
      localStorage.setItem("nota:locale", l);
      localStorage.setItem("nota:theme", t);
      localStorage.setItem("nota:calendar", c);
    },
    [locale, theme, calendar],
  );
  await page.reload();
  await page.locator("[data-pane=library]").waitFor();
  await page.waitForTimeout(900);
}

const list = () => page.locator("[data-pane=list]");
const library = () => page.locator("[data-pane=library]");
const shot = (name, options = {}) => page.screenshot({ path: path.join(OUT, `${name}.png`), ...options });

async function openNote(title) {
  await list().getByRole("list").getByRole("button", { name: new RegExp(`^${title}`) }).first().click();
  await page.waitForTimeout(700);
  await page.mouse.move(WINDOW.width - 8, WINDOW.height - 8);
}

async function openSection(pattern) {
  await library().getByRole("button", { name: pattern }).first().click();
  await page.waitForTimeout(500);
}

/** Boxes of two panes together, as a clip that a screenshot can take. */
async function clipOf(locator, padding = 0) {
  const box = await locator.boundingBox();
  return {
    x: Math.max(0, box.x - padding),
    y: Math.max(0, box.y - padding),
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  };
}

async function captureStills(locale, theme) {
  const tag = `${locale}-${theme}`;
  await resize(WINDOW);
  await prefer({ locale, theme });
  await openNote(MEETING);
  await shot(`main-${tag}`);

  // Tags, nested, beside the note that uses them.
  const expand = library().getByRole("button", { name: /#ስራ/ }).first();
  await expand.click().catch(() => undefined);
  await page.waitForTimeout(400);
  await shot(`tags-${tag}`, { clip: await clipOf(library()) });

  await openSection(locale === "am" ? /^የድምፅ ማስታወሻዎች/ : /^Voice notes/);
  await openNote(VOICE);
  await shot(`voice-${tag}`);

  await prefer({ locale, theme, calendar: "both" });
  await openNote(MEETING);
  await page.getByRole("button", { name: WORDS[locale].info }).first().click();
  await page.waitForTimeout(600);
  await shot(`calendar-${tag}`);
  await page.keyboard.press("Escape");

  await page.keyboard.press("Meta+Shift+f");
  await page.waitForTimeout(800);
  await page.mouse.move(WINDOW.width - 8, WINDOW.height - 8);
  await page.waitForTimeout(400);
  await shot(`zen-${tag}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}

async function recordDictation(locale, theme) {
  const name = `dictate-${locale}-${theme}`;
  await writeFile(transcripts, JSON.stringify(DICTATED));
  await resize(CLIP_WINDOW);
  await prefer({ locale, theme });
  await page.keyboard.press("Meta+n");
  await page.waitForTimeout(500);
  await page.keyboard.type(VOICE);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  await page.keyboard.press("Meta+Shift+f");
  await page.waitForTimeout(900);

  const dir = path.join(scratch, `frames-${name}`);
  await mkdir(dir);
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const writes = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    frames.push({ file, t: metadata.timestamp });
    writes.push(writeFile(file, Buffer.from(data, "base64")));
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1560, maxHeight: 1040 });
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: WORDS[locale].dictate }).click();
  for (const phrase of DICTATED) {
    await page.locator(".ProseMirror").getByText(phrase).first().waitFor({ timeout: 30_000 });
  }
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: WORDS[locale].stop }).click();
  await page.waitForTimeout(1500);
  await cdp.send("Page.stopScreencast");
  await Promise.all(writes);
  await cdp.detach();
  await shot(`${name}-poster`);

  const lines = frames.flatMap((frame, index) => {
    const next = frames[index + 1]?.t ?? frame.t + 1;
    return [`file '${frame.file}'`, `duration ${(next - frame.t).toFixed(4)}`];
  });
  lines.push(`file '${frames.at(-1).file}'`);
  const listFile = path.join(scratch, `${name}.txt`);
  await writeFile(listFile, lines.join("\n"));
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile,
    "-vf", `fps=${FPS},format=yuv420p`, "-an", "-c:v", "libx264", "-crf", "27", "-preset", "slow",
    "-movflags", "+faststart", path.join(OUT, `${name}.mp4`),
  ]);

  // Leave Zen mode and drop the new note, so the next take starts from the same library.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Meta+Backspace").catch(() => undefined);
  await page.waitForTimeout(300);
}

const onlyClips = process.argv.includes("--clips");
for (const locale of onlyClips ? [] : LOCALES) {
  for (const theme of THEMES) {
    await captureStills(locale, theme);
    console.log("stills", locale, theme);
  }
}
for (const locale of LOCALES) {
  for (const theme of THEMES) {
    await recordDictation(locale, theme);
    console.log("clip", locale, theme);
  }
}

await app.close();
await rm(scratch, { recursive: true, force: true });
