import { contextBridge, ipcRenderer } from "electron";
import { COMMAND_CHANNEL, IPC_CHANNELS, SETUP_CHANNEL } from "@shared/ipc-channels";
import type { CommandId } from "@shared/keymap";
import type { DesktopApi, DesktopEvents } from "@shared/types/desktop-api";
import type { SetupEvent } from "@shared/types/engine";

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
  setPinned: (input) => ipcRenderer.invoke(IPC_CHANNELS.setPinned, input),
  setArchived: (input) => ipcRenderer.invoke(IPC_CHANNELS.setArchived, input),
  setLocked: (input) => ipcRenderer.invoke(IPC_CHANNELS.setLocked, input),
  openLockedNote: (id) => ipcRenderer.invoke(IPC_CHANNELS.openLockedNote, id),
  getLockStatus: () => ipcRenderer.invoke(IPC_CHANNELS.getLockStatus),
  setLockPassword: (password) => ipcRenderer.invoke(IPC_CHANNELS.setLockPassword, password),
  unlockNotes: (password) => ipcRenderer.invoke(IPC_CHANNELS.unlockNotes, password),
  lockNotes: () => ipcRenderer.invoke(IPC_CHANNELS.lockNotes),
  exportNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.exportNote, input),
  attachAudio: (input) => ipcRenderer.invoke(IPC_CHANNELS.attachAudio, input),
  readAudio: (id) => ipcRenderer.invoke(IPC_CHANNELS.readAudio, id),
  transcribe: (input) => ipcRenderer.invoke(IPC_CHANNELS.transcribe, input),
  transcribeClip: (input) => ipcRenderer.invoke(IPC_CHANNELS.transcribeClip, input),
  listModels: () => ipcRenderer.invoke(IPC_CHANNELS.listModels),
  prepareModel: (model) => ipcRenderer.invoke(IPC_CHANNELS.prepareModel, model),
  startModelSetup: (model) => ipcRenderer.invoke(IPC_CHANNELS.startModelSetup, model),
  cancelModelSetup: () => ipcRenderer.invoke(IPC_CHANNELS.cancelModelSetup),
  getOnboarding: () => ipcRenderer.invoke(IPC_CHANNELS.getOnboarding),
  completeOnboarding: () => ipcRenderer.invoke(IPC_CHANNELS.completeOnboarding),
};

// The command id is validated in the renderer (src/lib/desktop.ts) before use.
const desktopEvents: DesktopEvents = {
  onCommand: (listener) => {
    const handle = (_event: Electron.IpcRendererEvent, command: CommandId) => listener(command);
    ipcRenderer.on(COMMAND_CHANNEL, handle);
    return () => ipcRenderer.removeListener(COMMAND_CHANNEL, handle);
  },
  onSetupEvent: (listener) => {
    const handle = (_event: Electron.IpcRendererEvent, setup: SetupEvent) => listener(setup);
    ipcRenderer.on(SETUP_CHANNEL, handle);
    return () => ipcRenderer.removeListener(SETUP_CHANNEL, handle);
  },
};

contextBridge.exposeInMainWorld("desktop", desktop);
contextBridge.exposeInMainWorld("desktopEvents", desktopEvents);
