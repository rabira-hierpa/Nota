#!/usr/bin/env node
/**
 * Renders the theme's sharing pictures (og-en.png, og-am.png, 1200 by 630) and its
 * screenshot for the Themes screen (screenshot.png, 1200 by 900) from the theme's
 * own fonts, colours and app shots.
 *
 *   node website/scripts/build-social.mjs
 *
 * Run from the repository root, after build-assets.mjs.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const { chromium } = require("playwright");

const THEME = resolve("website/wordpress-theme/nota-app");
const TYPES = { ".woff2": "font/woff2", ".png": "image/png", ".webp": "image/webp" };
/* A page set from a string can't load file:// addresses, so the files go inside it. */
const asset = (path) => `data:${TYPES[extname(path)]};base64,${readFileSync(join(THEME, path)).toString("base64")}`;

const COPY = {
  en: { title: "Amharic notes you can write or speak.", line: "Free. Offline. Nothing leaves your device." },
  am: { title: "የአማርኛ ማስታወሻ፣ በመጻፍም በመናገርም።", line: "ነፃ። ያለ ኢንተርኔት። ምንም ነገር ከመሣሪያዎ አይወጣም።" },
};

const page = (lang, width, height, titleSize) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:"Plus Jakarta Sans";font-weight:200 800;src:url("${asset("assets/fonts/plus-jakarta-sans-latin.woff2")}") format("woff2")}
@font-face{font-family:"Noto Sans Ethiopic";font-weight:100 900;src:url("${asset("assets/fonts/noto-sans-ethiopic.woff2")}") format("woff2");unicode-range:U+1200-1399,U+2D80-2DDE,U+AB01-AB2E}
*{box-sizing:border-box;margin:0}
html,body{width:${width}px;height:${height}px;overflow:hidden}
body{display:flex;flex-direction:column;padding:56px 64px 0;background:#fbfcf9;color:#1d2a21;font-family:"Plus Jakarta Sans","Noto Sans Ethiopic",sans-serif}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:28px;font-size:30px;font-weight:700;letter-spacing:-.015em}
.brand img{width:48px;height:48px;border-radius:12px}
h1{margin-bottom:22px;font-size:${titleSize}px;font-weight:700;line-height:${lang === "am" ? 1.24 : 1.04};letter-spacing:${lang === "am" ? 0 : "-.035em"};text-wrap:balance}
p{margin-bottom:32px;font-size:26px;color:#5d6b61}
.shot{flex:none;overflow:hidden;border:1px solid #dde4db;border-radius:14px;box-shadow:0 24px 56px -28px rgb(29 42 33/.28)}
.shot img{display:block;width:100%}
</style></head><body>
<div class="brand"><img src="${asset("assets/img/icon-180.png")}" alt="">Nota</div>
<h1>${COPY[lang].title}</h1>
<p>${COPY[lang].line}</p>
<div class="shot"><img src="${asset(`assets/img/main-${lang}-light-1200.webp`)}" alt=""></div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });

async function render(lang, width, height, titleSize, file) {
  const context = await browser.newContext({ viewport: { width, height } });
  const tab = await context.newPage();
  await tab.setContent(page(lang, width, height, titleSize), { waitUntil: "networkidle" });
  const missing = await tab.evaluate(async ({ size, sample }) => {
    await document.fonts.ready;
    const images = [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src.slice(0, 40));
    const fonts = ["Plus Jakarta Sans", "Noto Sans Ethiopic"].filter((family) => ![...document.fonts].some((font) => font.family.replace(/"/g, "") === family && font.status === "loaded") && (family === "Plus Jakarta Sans" || sample));
    return [...images, ...fonts, document.fonts.check(`700 ${size}px "Plus Jakarta Sans"`) ? "" : "Plus Jakarta Sans not ready"].filter(Boolean);
  }, { size: titleSize, sample: lang === "am" });
  if (missing.length) throw new Error(`${file} is missing: ${missing.join(", ")}`);
  await tab.screenshot({ path: join(THEME, file) });
  await context.close();
  console.log(file);
}

await render("en", 1200, 630, 72, "assets/img/og-en.png");
await render("am", 1200, 630, 62, "assets/img/og-am.png");
await render("en", 1200, 900, 84, "screenshot.png");

await browser.close();
