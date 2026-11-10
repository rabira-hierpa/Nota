#!/usr/bin/env node
/**
 * A live preview of the theme at http://localhost:9411, on this Mac only.
 *
 *   node website/scripts/preview-theme.mjs
 *
 * The page runs WordPress in the browser tab (WordPress Playground) and hands it
 * the zip from website/dist, so the zip never leaves this machine. Each reload is a
 * new throwaway site with the newest zip, signed in as its admin. Edits made in it
 * are lost on reload. It needs a network connection, for WordPress itself.
 */
import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 9411);
const ZIP = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "nota-app-theme.zip");

if (!existsSync(ZIP)) {
  console.error("No zip yet. Run: bash website/scripts/build-theme-zip.sh");
  process.exit(1);
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nota site preview</title>
<style>
  :root { color-scheme: light dark; --bar: #eef2ec; --ink: #1d2a21; --muted: #5d6b61; --line: #dde4db; --on: #e2f0e4; }
  @media (prefers-color-scheme: dark) { :root { --bar: #1a221c; --ink: #e5ece6; --muted: #9aa89d; --line: #2b3630; --on: rgb(79 191 122 / .16); } }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { display: flex; flex-direction: column; background: var(--bar); color: var(--ink); font: 14px/1.4 system-ui, sans-serif; }
  header { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; padding: 6px 10px; border-bottom: 1px solid var(--line); }
  strong { margin-right: 8px; }
  button { min-height: 32px; padding: 4px 12px; border: 0; border-radius: 999px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  button:hover, button[aria-pressed="true"] { background: var(--on); }
  button:disabled { color: var(--muted); cursor: default; background: transparent; }
  #status { margin-left: auto; color: var(--muted); }
  iframe { flex: 1; width: 100%; border: 0; background: #fff; }
</style>
</head>
<body>
<header>
  <strong>Nota preview</strong>
  <button data-path="/" aria-pressed="true" disabled>English</button>
  <button data-path="/?lang=am" lang="am" disabled>አማርኛ</button>
  <button data-path="/wp-admin/customize.php?autofocus[panel]=nota_landing" disabled>Edit in the Customizer</button>
  <button data-path="/wp-admin/themes.php" disabled>Themes</button>
  <span id="status" role="status">Starting WordPress, about a minute the first time.</span>
</header>
<iframe id="wp" title="WordPress with the Nota theme"></iframe>
<script type="module">
  import { startPlaygroundWeb } from "https://playground.wordpress.net/client/index.js";

  const status = document.getElementById("status");
  const buttons = [...document.querySelectorAll("button")];
  try {
    const zip = new Uint8Array(await (await fetch("/nota-app-theme.zip")).arrayBuffer());
    const client = await startPlaygroundWeb({
      iframe: document.getElementById("wp"),
      remoteUrl: "https://playground.wordpress.net/remote.html",
      blueprint: {
        preferredVersions: { php: "8.3", wp: "latest" },
        login: true,
        landingPage: "/",
        steps: [
          {
            step: "installTheme",
            themeData: { resource: "literal", name: "nota-app-theme.zip", contents: zip },
            options: { activate: true },
          },
        ],
      },
    });
    await client.isReady();
    window.notaClient = client;
    status.textContent = "A throwaway site in this tab. Reloading starts it again.";
    for (const button of buttons) {
      button.disabled = false;
      button.addEventListener("click", () => {
        buttons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
        client.goTo(button.dataset.path);
      });
    }
  } catch (error) {
    status.textContent = "It could not start: " + error.message;
    console.error(error);
  }
</script>
</body>
</html>
`;

createServer((request, response) => {
  if (request.url === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }).end(PAGE);
  } else if (request.url === "/nota-app-theme.zip") {
    response.writeHead(200, { "Content-Type": "application/zip", "Cache-Control": "no-store" });
    createReadStream(ZIP).pipe(response);
  } else {
    response.writeHead(404).end();
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`http://localhost:${PORT}`);
});
