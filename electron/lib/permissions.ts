import type { Session } from "electron";
import { isTrustedUrl } from "@main/lib/trusted-origin";

/** The app's own pages may use the microphone. Nothing else is granted. */
export function allowMicrophoneOnly(session: Session, trustedOrigin: string): void {
  session.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const audioOnly =
      permission === "media" &&
      "mediaTypes" in details &&
      (details.mediaTypes ?? []).every((type) => type === "audio");
    callback(audioOnly && isTrustedUrl(details.requestingUrl, trustedOrigin));
  });
  session.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin) =>
      permission === "media" && isTrustedUrl(requestingOrigin, trustedOrigin),
  );
}
