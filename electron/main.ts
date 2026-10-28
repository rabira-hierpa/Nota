import { existsSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow, nativeTheme, session } from "electron";
import { createDesktopHandlers } from "@main/ipc/desktop-handlers";
import { registerIpc } from "@main/ipc/register-ipc";
import { AmharicModelEngine } from "@main/lib/amharic-model-engine";
import { APP_ORIGIN, registerAppSchemePrivileges, serveStaticExport } from "@main/lib/app-protocol";
import { readAvailableModels, readLocalModelConfig, readVoiceStudioConfig } from "@main/lib/config";
import { resolveDataFolder } from "@main/lib/data-folder";
import { importLegacyRecordings } from "@main/lib/legacy-recordings";
import { NotesRepo } from "@main/lib/notes-repo";
import { allowMicrophoneOnly } from "@main/lib/permissions";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import { isTrustedUrl, originOf } from "@main/lib/trusted-origin";
import { VoiceStudioClient } from "@main/lib/voice-studio";
import type { ModelId } from "@shared/types/engine";

// `npm run dev` points this at the Next dev server; otherwise the static
// export in out/ is served over app://.
const devRendererUrl = process.env.ELECTRON_RENDERER_URL;
const trustedOrigin = (devRendererUrl && originOf(devRendererUrl)) || APP_ORIGIN;

const APP_NAME = "Nota";
// Matches the editor's paper colour in each theme, so the window never flashes white.
const BACKGROUND = { light: "#fbfaf8", dark: "#1c1b1a" } as const;

// Lets e2e tests (and anyone keeping test data apart) use a throwaway
// profile, or a throwaway parent folder to exercise the move from the old name.
if (process.env.STT_APP_DATA_DIR) app.setPath("appData", process.env.STT_APP_DATA_DIR);
app.setPath("userData", process.env.STT_USER_DATA_DIR || resolveDataFolder(app.getPath("appData")));

if (!app.isPackaged) {
  const envFile = path.join(app.getAppPath(), ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

registerAppSchemePrivileges();

function createEngine(model: ModelId): TranscriptionEngine {
  if (model === "voicestudio") return new VoiceStudioClient(readVoiceStudioConfig());
  // The Python helper ships beside the app (extraResources) when packaged.
  const helperDir = app.isPackaged
    ? path.join(process.resourcesPath, "python")
    : path.join(app.getAppPath(), "electron", "python");
  return new AmharicModelEngine(readLocalModelConfig(model, { userData: app.getPath("userData"), helperDir }));
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1120,
    height: 740,
    minWidth: 760,
    minHeight: 480,
    title: APP_NAME,
    backgroundColor: nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light,
    // Bear-style: the traffic lights sit in the sidebar, which doubles as the title bar.
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 18, y: 18 } }
      : {}),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedUrl(url, trustedOrigin)) event.preventDefault();
  });

  window.loadURL(devRendererUrl ?? `${APP_ORIGIN}/`).catch((error: Error) => {
    console.error("[main] failed to load the renderer:", error.message);
  });
}

async function openNotes(): Promise<NotesRepo> {
  const userData = app.getPath("userData");
  const repo = new NotesRepo(path.join(userData, "notes"));
  try {
    const imported = await importLegacyRecordings(path.join(userData, "recordings"), repo);
    if (imported > 0) console.info(`[main] turned ${imported} recordings into notes`);
  } catch (error) {
    // The recordings stay where they are; the import runs again next launch.
    console.error("[main] couldn't import the old recordings:", error instanceof Error ? error.message : error);
  }
  return repo;
}

app
  .whenReady()
  .then(async () => {
    if (!devRendererUrl) serveStaticExport(path.join(app.getAppPath(), "out"));
    allowMicrophoneOnly(session.defaultSession, trustedOrigin);

    const repo = await openNotes();
    const engines = new Map(readAvailableModels().map((model) => [model, createEngine(model)] as const));
    app.on("will-quit", () => engines.forEach((engine) => engine.dispose?.()));
    registerIpc(createDesktopHandlers(repo, engines), trustedOrigin);

    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch((error: Error) => {
    console.error("[main] startup failed:", error.message);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
