import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "@shared/ipc-channels";
import type { DesktopApi } from "@shared/types/desktop-api";

// The only bridge between the sandboxed renderer and the main process. Keep
// it a thin pass-through: validation lives in electron/ipc/desktop-handlers.ts.
const desktop: DesktopApi = {
  listNotes: () => ipcRenderer.invoke(IPC_CHANNELS.listNotes),
  createNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.createNote, input),
  createVoiceNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.createVoiceNote, input),
  updateNoteContent: (input) => ipcRenderer.invoke(IPC_CHANNELS.updateNoteContent, input),
  setFavorite: (input) => ipcRenderer.invoke(IPC_CHANNELS.setFavorite, input),
  setTrashed: (input) => ipcRenderer.invoke(IPC_CHANNELS.setTrashed, input),
  deleteNote: (id) => ipcRenderer.invoke(IPC_CHANNELS.deleteNote, id),
  emptyTrash: () => ipcRenderer.invoke(IPC_CHANNELS.emptyTrash),
  attachAudio: (input) => ipcRenderer.invoke(IPC_CHANNELS.attachAudio, input),
  readAudio: (id) => ipcRenderer.invoke(IPC_CHANNELS.readAudio, id),
  transcribe: (input) => ipcRenderer.invoke(IPC_CHANNELS.transcribe, input),
  transcribeClip: (input) => ipcRenderer.invoke(IPC_CHANNELS.transcribeClip, input),
  listModels: () => ipcRenderer.invoke(IPC_CHANNELS.listModels),
  prepareModel: (model) => ipcRenderer.invoke(IPC_CHANNELS.prepareModel, model),
};

contextBridge.exposeInMainWorld("desktop", desktop);
