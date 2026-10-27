import { stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { net, protocol } from "electron";
import { resolveExportPath } from "@main/lib/static-path";

export const APP_SCHEME = "app";
export const APP_ORIGIN = `${APP_SCHEME}://bundle`;

// Next's static export inlines its bootstrap scripts, hence 'unsafe-inline'.
// The renderer never touches the network: VoiceStudio is called from main.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

/** Must run before the app is ready. */
export function registerAppSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true } },
  ]);
}

/** Serves Next's `out/` folder at app://bundle/. */
export function serveStaticExport(outDir: string): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const file = resolveExportPath(outDir, new URL(request.url).pathname);
    if (!file || !(await isFile(file))) {
      return new Response("Not found", { status: 404 });
    }
    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    return new Response(response.body, { status: response.status, headers });
  });
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}
