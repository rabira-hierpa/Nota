import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc-channels";
import type { DesktopApi } from "@shared/types/desktop-api";

// The only bridge between the sandboxed renderer and the main process. Keep
// it a thin pass-through: validation lives in electron/ipc/desktop-handlers.ts.
const desktop: DesktopApi = {
  listRecordings: () => ipcRenderer.invoke(IPC_CHANNELS.listRecordings),
  createRecording: (input) => ipcRenderer.invoke(IPC_CHANNELS.createRecording, input),
  readAudio: (id) => ipcRenderer.invoke(IPC_CHANNELS.readAudio, id),
  transcribe: (id) => ipcRenderer.invoke(IPC_CHANNELS.transcribe, id),
  updateTranscript: (input) => ipcRenderer.invoke(IPC_CHANNELS.updateTranscript, input),
  deleteRecording: (id) => ipcRenderer.invoke(IPC_CHANNELS.deleteRecording, id),
  engineStatus: () => ipcRenderer.invoke(IPC_CHANNELS.engineStatus),
};

contextBridge.exposeInMainWorld("desktop", desktop);
