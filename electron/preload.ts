import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc-channels";
import type { DesktopApi } from "@shared/types/desktop-api";

// The only bridge between the sandboxed renderer and the main process. Keep
// it a thin pass-through: validation lives in electron/ipc/desktop-handlers.ts.
const desktop: DesktopApi = {
  listRecordings: () => ipcRenderer.invoke(IPC_CHANNELS.listRecordings),
  createRecording: (input) => ipcRenderer.invoke(IPC_CHANNELS.createRecording, input),
  readAudio: (id) => ipcRenderer.invoke(IPC_CHANNELS.readAudio, id),
  transcribe: (input) => ipcRenderer.invoke(IPC_CHANNELS.transcribe, input),
  transcribeClip: (input) => ipcRenderer.invoke(IPC_CHANNELS.transcribeClip, input),
  updateTranscript: (input) => ipcRenderer.invoke(IPC_CHANNELS.updateTranscript, input),
  deleteRecording: (id) => ipcRenderer.invoke(IPC_CHANNELS.deleteRecording, id),
  listModels: () => ipcRenderer.invoke(IPC_CHANNELS.listModels),
  prepareModel: (model) => ipcRenderer.invoke(IPC_CHANNELS.prepareModel, model),
};

contextBridge.exposeInMainWorld("desktop", desktop);
