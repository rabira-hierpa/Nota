import { ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { isTrustedUrl } from "@main/lib/trusted-origin";
import { IPC_CHANNELS } from "@shared/ipc-channels";
import type { DesktopApi } from "@shared/types/desktop-api";
import type { Result } from "@shared/types/result";

const UNTRUSTED_SENDER: Result<null> = { success: false, error: "Request refused." };

/** Wires each DesktopApi method to its channel, answering only our own pages. */
export function registerIpc(handlers: DesktopApi, trustedOrigin: string): void {
  const methods = Object.keys(IPC_CHANNELS) as (keyof DesktopApi)[];
  for (const method of methods) {
    ipcMain.handle(IPC_CHANNELS[method], (event, payload) => {
      if (!isTrustedSender(event, trustedOrigin)) return UNTRUSTED_SENDER;
      return handlers[method](payload);
    });
  }
}

function isTrustedSender(event: IpcMainInvokeEvent, trustedOrigin: string): boolean {
  const url = event.senderFrame?.url;
  return url ? isTrustedUrl(url, trustedOrigin) : false;
}
