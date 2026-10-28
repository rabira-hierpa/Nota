import { existsSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow, session } from "electron";
import { createDesktopHandlers } from "@main/ipc/desktop-handlers";
import { registerIpc } from "@main/ipc/register-ipc";
import { AmharicModelEngine } from "@main/lib/amharic-model-engine";
import { APP_ORIGIN, registerAppSchemePrivileges, serveStaticExport } from "@main/lib/app-protocol";
import { readAvailableModels, readLocalModelConfig, readVoiceStudioConfig } from "@main/lib/config";
import { allowMicrophoneOnly } from "@main/lib/permissions";
import { RecordingsRepo } from "@main/lib/recordings-repo";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import { isTrustedUrl, originOf } from "@main/lib/trusted-origin";
import { VoiceStudioClient } from "@main/lib/voice-studio";
import type { ModelId } from "@shared/types/engine";

// `npm run dev` points this at the Next dev server; otherwise the static
// export in out/ is served over app://.
const devRendererUrl = process.env.ELECTRON_RENDERER_URL;
const trustedOrigin = (devRendererUrl && originOf(devRendererUrl)) || APP_ORIGIN;

// Lets e2e tests (and anyone keeping test data apart) use a throwaway profile.
if (process.env.STT_USER_DATA_DIR) {
  app.setPath("userData", process.env.STT_USER_DATA_DIR);
}

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
    title: "Amharic Speech to Text",
    backgroundColor: "#ffffff",
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

app
  .whenReady()
  .then(() => {
    if (!devRendererUrl) serveStaticExport(path.join(app.getAppPath(), "out"));
    allowMicrophoneOnly(session.defaultSession, trustedOrigin);

    const repo = new RecordingsRepo(path.join(app.getPath("userData"), "recordings"));
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
