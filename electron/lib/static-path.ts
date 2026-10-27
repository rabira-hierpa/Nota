import path from "node:path";

/**
 * Maps an app:// URL path onto a file in Next's static export, the way a
 * static host would: `/` → index.html, `/about` → about.html. Returns null for
 * anything that would escape `root`.
 */
export function resolveExportPath(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;

  const relative = decoded === "/" || decoded === "" ? "/index.html" : decoded;
  const withExtension = path.extname(relative) ? relative : `${relative}.html`;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, `.${withExtension}`);
  return resolved.startsWith(`${resolvedRoot}${path.sep}`) ? resolved : null;
}
