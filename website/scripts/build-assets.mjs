#!/usr/bin/env node
/**
 * Turns raw captures into the theme's pictures, in assets/img.
 *
 *   node website/scripts/build-assets.mjs <desktop shots folder> <phone shots folder>
 *
 * The folders come from capture-desktop.mjs and capture-phone.py. Writes WebP at
 * the sizes inc/helpers.php lists, the dictation clips and their first-paint frames,
 * and the icons. Run from the repository root.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const sharp = require("sharp");

const [desktopDir, phoneDir] = process.argv.slice(2);
if (!desktopDir) {
  console.error("usage: build-assets.mjs <desktop shots> [<phone shots>]");
  process.exit(1);
}

const OUT = resolve("website/wordpress-theme/nota-app/assets/img");
const WEBP = { quality: 82, effort: 6 };
const VARIANTS = ["en-light", "en-dark", "am-light", "am-dark"];

/* The widths must match nota_shot_sizes() in inc/helpers.php. */
const WINDOW_SHOTS = {
  main: [1200, 2000],
  voice: [1000, 1800],
  zen: [1000, 1600],
};
const SIDEBAR = { left: 0, top: 0, width: 448, height: 1120 };
/* Exactly the app's Note info popover, with its round corners, so nothing of the window
   behind it shows. The width must match nota_shot_sizes() as well. */
const INFO_PANEL = { left: 2050, top: 98, width: 636, height: 489 };
const INFO_PANEL_MASK = Buffer.from(`<svg width="${INFO_PANEL.width}" height="${INFO_PANEL.height}"><rect width="100%" height="100%" rx="20" ry="20"/></svg>`);
const PHONE_WIDTH = 720;
/* The status bar and gesture bar of the emulator are not the app. */
const PHONE_KEEP = { left: 0, top: 0, width: 1080, height: 2400 };

mkdirSync(OUT, { recursive: true });

async function save(pipeline, name) {
  const info = await pipeline.webp(WEBP).toFile(join(OUT, name));
  console.log(`${name}\t${Math.round(info.size / 1024)} KB`);
}

for (const variant of VARIANTS) {
  for (const [shot, widths] of Object.entries(WINDOW_SHOTS)) {
    for (const width of widths) {
      await save(sharp(join(desktopDir, `${shot}-${variant}.png`)).resize({ width }), `${shot}-${variant}-${width}.webp`);
    }
  }

  await save(sharp(join(desktopDir, `tags-${variant}.png`)).extract(SIDEBAR), `tags-${variant}-448.webp`);
  await save(sharp(join(desktopDir, `calendar-${variant}.png`)).extract(INFO_PANEL).composite([{ input: INFO_PANEL_MASK, blend: "dest-in" }]), `calendar-${variant}-${INFO_PANEL.width}.webp`);

  await save(sharp(join(desktopDir, `dictate-${variant}-poster.png`)), `clip-${variant}-1560.webp`);
  copyFileSync(join(desktopDir, `dictate-${variant}.mp4`), join(OUT, `dictate-${variant}.mp4`));

  if (phoneDir) {
    for (const shot of ["home", "note"]) {
      const source = join(phoneDir, `phone-${shot}-${variant}.png`);
      if (existsSync(source)) {
        await save(sharp(source).extract(PHONE_KEEP).resize({ width: PHONE_WIDTH }), `phone-${shot}-${variant}-${PHONE_WIDTH}.webp`);
      } else {
        console.warn(`missing ${source}`);
      }
    }
  }
}

/* The rounded icon reads best small; the square one stands in where an app icon is expected. */
for (const size of [64, 180, 512]) {
  await sharp("build/icon-mac.png").resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(join(OUT, `icon-${size}.png`));
}
