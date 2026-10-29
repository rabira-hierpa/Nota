import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, dialog, Menu, nativeTheme, powerMonitor, session } from "electron";
import { createDesktopHandlers } from "@main/ipc/desktop-handlers";
import type { PickAudioFile, SaveExport } from "@main/ipc/desktop-handlers";
import { registerIpc } from "@main/ipc/register-ipc";
import { AmharicModelEngine } from "@main/lib/amharic-model-engine";
import { buildAppMenu } from "@main/lib/app-menu";
import { APP_ORIGIN, registerAppSchemePrivileges, serveStaticExport } from "@main/lib/app-protocol";
import { readAvailableModels, readLocalModelConfig, readVoiceStudioConfig } from "@main/lib/config";
import { resolveDataFolder } from "@main/lib/data-folder";
import { safeFileName } from "@main/lib/file-name";
import { importLegacyRecordings } from "@main/lib/legacy-recordings";
import { ModelSetup } from "@main/lib/model-setup";
import { Onboarding } from "@main/lib/onboarding";
import { NoteVault } from "@main/lib/note-vault";
import { NotesRepo } from "@main/lib/notes-repo";
import { allowMicrophoneOnly } from "@main/lib/permissions";
import type { TranscriptionEngine } from "@main/lib/transcription-engine";
import { isTrustedUrl, originOf } from "@main/lib/trusted-origin";
import { VoiceStudioClient } from "@main/lib/voice-studio";
import { COMMAND_CHANNEL, SETUP_CHANNEL } from "@shared/ipc-channels";
import type { CommandId } from "@shared/keymap";
import { IMPORT_AUDIO_EXTENSIONS } from "@shared/schemas/note";
import type { ModelId } from "@shared/types/engine";
import type { Locale } from "@shared/types/locale";
import type { ExportFormat } from "@shared/types/note";

// `npm run dev` points this at the Next dev server; otherwise the static
// export in out/ is served over app://.
const devRendererUrl = process.env.ELECTRON_RENDERER_URL;
const trustedOrigin = (devRendererUrl && originOf(devRendererUrl)) || APP_ORIGIN;

const APP_NAME = "Nota";
// Matches the editor's paper colour in each theme, so the window never flashes white.
const BACKGROUND = { light: "#fbfcf9", dark: "#151b17" } as const;
const EXPORT_FILTERS: Record<ExportFormat, { name: string; extensions: string[] }> = {
  md: { name: "Markdown", extensions: ["md"] },
  html: { name: "Web page", extensions: ["html"] },
  txt: { name: "Plain text", extensions: ["txt"] },
};

let mainWindow: BrowserWindow | null = null;

// Lets e2e tests (and anyone keeping test data apart) use a throwaway
// profile, or a throwaway parent folder to exercise the move from the old name.
if (process.env.STT_APP_DATA_DIR) app.setPath("appData", process.env.STT_APP_DATA_DIR);
app.setPath("userData", process.env.STT_USER_DATA_DIR || resolveDataFolder(app.getPath("appData")));

if (!app.isPackaged) {
  const envFile = path.join(app.getAppPath(), ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

registerAppSchemePrivileges();

/** Where the files that ship beside the app live: resources/ when packaged, the repo in development. */
function bundled(packagedDir: string, repoDir: string): string {
  return app.isPackaged ? path.join(process.resourcesPath, packagedDir) : path.join(app.getAppPath(), repoDir);
}

function createEngine(model: ModelId): TranscriptionEngine {
  if (model === "voicestudio") return new VoiceStudioClient(readVoiceStudioConfig());
  // The Python helper ships beside the app (extraResources) when packaged.
  const helperDir = app.isPackaged
    ? path.join(process.resourcesPath, "python")
    : path.join(app.getAppPath(), "electron", "python");
  return new AmharicModelEngine(readLocalModelConfig(model, { userData: app.getPath("userData"), helperDir }));
}

/** Runs a command in the renderer: from the menu, or when the Mac locks or sleeps. */
function sendCommand(command: CommandId): void {
  const target = BrowserWindow.getFocusedWindow() ?? mainWindow;
  target?.webContents.send(COMMAND_CHANNEL, command);
}

/** Asks where to save an export. e2e tests set STT_EXPORT_DIR to skip the dialog. */
const saveExport: SaveExport = async ({ title, format, data }) => {
  const name = `${safeFileName(title)}.${format}`;
  const testDir = process.env.STT_EXPORT_DIR;
  if (testDir) {
    await writeFile(path.join(testDir, name), data, "utf8");
    return true;
  }
  const options = { defaultPath: path.join(app.getPath("documents"), name), filters: [EXPORT_FILTERS[format]] };
  const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return false;
  await writeFile(result.filePath, data, "utf8");
  return true;
};

/** Asks for a recording to transcribe. e2e tests set NOTA_IMPORT_AUDIO to a file to skip the dialog. */
const pickAudioFile: PickAudioFile = async () => {
  const testFile = process.env.NOTA_IMPORT_AUDIO;
  if (testFile) return testFile;
  const options: Electron.OpenDialogOptions = {
    title: "Transcribe a recording",
    buttonLabel: "Transcribe",
    defaultPath: app.getPath("documents"),
    properties: ["openFile"],
    filters: [{ name: "Recordings", extensions: [...IMPORT_AUDIO_EXTENSIONS] }],
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  return result.canceled ? null : (result.filePaths[0] ?? null);
};

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

  mainWindow = window;
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
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

async function openNotes(vault: NoteVault): Promise<NotesRepo> {
  const userData = app.getPath("userData");
  const repo = new NotesRepo(path.join(userData, "notes"), { vault });
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

    const vault = new NoteVault(path.join(app.getPath("userData"), "vault.json"));
    const repo = await openNotes(vault);
    const engines = new Map(readAvailableModels().map((model) => [model, createEngine(model)] as const));
    app.on("will-quit", () => engines.forEach((engine) => engine.dispose?.()));
    const userData = app.getPath("userData");
    const setup = new ModelSetup(
      bundled("setup", "scripts"),
      userData,
      (event) => mainWindow?.webContents.send(SETUP_CHANNEL, event),
    );
    app.on("will-quit", () => setup.cancel());
    // e2e tests turn the guide off (NOTA_ONBOARDING=off) to start from an empty library.
    const onboarding = new Onboarding(
      path.join(userData, "onboarded"),
      async () => (await repo.list()).length > 0,
      process.env.NOTA_ONBOARDING === "off",
    );
    // The menu starts in English and follows the language the renderer reports (Settings → Language).
    const applyMenu = (locale: Locale) =>
      Menu.setApplicationMenu(buildAppMenu(sendCommand, { development: !app.isPackaged, locale }));
    registerIpc(
      createDesktopHandlers({ repo, engines, vault, saveExport, pickAudioFile, setup, onboarding, onLocale: applyMenu }),
      trustedOrigin,
    );
    applyMenu("en");
    // Locked notes close when the Mac locks or sleeps, as in Bear.
    const lockAll = () => {
      vault.lock();
      sendCommand("lockAll");
    };
    powerMonitor.on("lock-screen", lockAll);
    powerMonitor.on("suspend", lockAll);

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
