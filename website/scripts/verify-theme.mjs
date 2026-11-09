#!/usr/bin/env node
/**
 * Installs the theme's zip on a real WordPress and checks the result.
 *
 *   node website/scripts/verify-theme.mjs <output folder> [--php=8.3] [--no-plugins]
 *
 * WordPress runs in WordPress Playground's browser build, embedded in a small local
 * page: PHP as WebAssembly inside this script's own Chrome, with a throwaway profile
 * and a throwaway site. Nothing is installed and nothing reaches a server but the
 * requests for WordPress and the plugins. (The Playground CLI would do too, but it
 * unpacks more than 5 GB.)
 *
 * The site is set up to be hard on the theme: Elementor and LiteSpeed Cache active,
 * and a home page built with Elementor on its Canvas template, with a kit that
 * paints every h1 magenta. The theme goes in through the real Upload Theme form.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(join(process.cwd(), "package.json"));
const { chromium } = require("playwright");

const out = resolve(process.argv[2] ?? "verify-out");
const php = (process.argv.find((arg) => arg.startsWith("--php=")) ?? "--php=8.3").split("=")[1];
const withPlugins = !process.argv.includes("--no-plugins");
const zip = resolve("website/dist/nota-app-theme.zip");
const axeSource = readFileSync(resolve("node_modules/axe-core/axe.min.js"), "utf8");

mkdirSync(out, { recursive: true });

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
}
const note = (text) => console.log(`      ${text}`);

/* --- The site ------------------------------------------------------------------ */

const LOG_PHP = `function nota_step($label) { file_put_contents('/wordpress/nota-setup.txt', $label . "\\n", FILE_APPEND); }
register_shutdown_function(function () {
	$error = error_get_last();
	if ($error && in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_RECOVERABLE_ERROR), true)) {
		nota_step('FATAL ' . $error['message'] . ' in ' . $error['file'] . ':' . $error['line']);
		exit(0);
	}
});`;

/* One at a time and logged: a plugin that dies on activation should say so. */
const ACTIVATE_PHP = `<?php
${LOG_PHP}
require_once '/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
foreach (array('elementor/elementor.php', 'litespeed-cache/litespeed-cache.php') as $plugin) {
	nota_step('activating ' . $plugin);
	$result = activate_plugin($plugin);
	nota_step(is_wp_error($result) ? 'error ' . $result->get_error_message() : 'active ' . $plugin);
}
`;

/* The page as a visitor sees it, with no password to type: only on this throwaway site. */
const AS_VISITOR_PHP = `<?php
add_filter('determine_current_user', function ($user) { return isset($_GET['as_visitor']) ? 0 : $user; }, 99);
`;

const SETUP_PHP = `<?php
${LOG_PHP}
nota_step('load');
require_once '/wordpress/wp-load.php';
wp_set_current_user(1);
nota_step('loaded');
update_option('permalink_structure', '/%postname%/');
update_option('blogname', 'Test site');

$old = wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'Coming Soon','post_name'=>'coming-soon','post_content'=>'The old home page.'));
update_post_meta($old, '_elementor_edit_mode', 'builder');
update_post_meta($old, '_elementor_template_type', 'wp-page');
update_post_meta($old, '_wp_page_template', 'elementor_canvas');
update_post_meta($old, '_elementor_data', wp_slash(wp_json_encode(array(array('id'=>'a1b2c3d','elType'=>'container','settings'=>array(),'elements'=>array(array('id'=>'e4f5a6b','elType'=>'widget','widgetType'=>'heading','settings'=>array('title'=>'The old home page, built with Elementor','header_size'=>'h1'),'elements'=>array())))))));
update_option('show_on_front', 'page');
update_option('page_on_front', $old);

nota_step('home page made');
$built = wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'Built with Elementor','post_name'=>'built','post_content'=>''));
update_post_meta($built, '_elementor_edit_mode', 'builder');
update_post_meta($built, '_elementor_template_type', 'wp-page');
update_post_meta($built, '_elementor_data', wp_slash(wp_json_encode(array(array('id'=>'b1b2c3d','elType'=>'container','settings'=>array(),'elements'=>array(array('id'=>'b4f5a6b','elType'=>'widget','widgetType'=>'heading','settings'=>array('title'=>'A page in the builder','header_size'=>'h2'),'elements'=>array())))))));

nota_step('builder page made');
$blog = wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'Blog','post_name'=>'blog'));
update_option('page_for_posts', $blog);
wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'About Nota','post_name'=>'about','post_content'=>'<!-- wp:paragraph --><p>An ordinary page, with <a href="#">a link</a>.</p><!-- /wp:paragraph --><!-- wp:heading --><h2 class="wp-block-heading">A heading</h2><!-- /wp:heading --><!-- wp:list --><ul class="wp-block-list"><li>One</li><li>Two</li></ul><!-- /wp:list -->'));
wp_insert_post(array('post_type'=>'post','post_status'=>'publish','post_title'=>'የመጀመሪያው ጽሑፍ','post_name'=>'first','post_content'=>'<!-- wp:paragraph --><p>ይህ የሙከራ ጽሑፍ ነው። And some English beside it.</p><!-- /wp:paragraph -->'));

nota_step('content made');
if (class_exists('\\\\Elementor\\\\Plugin')) {
	$kit = (int) get_option('elementor_active_kit');
	if (!$kit) {
		$kit = wp_insert_post(array('post_type'=>'elementor_library','post_status'=>'publish','post_title'=>'Kit'));
		update_post_meta($kit, '_elementor_template_type', 'kit');
		update_post_meta($kit, '_elementor_edit_mode', 'builder');
		update_option('elementor_active_kit', $kit);
	}
	update_post_meta($kit, '_elementor_page_settings', array('h1_color'=>'#ff00ff','body_color'=>'#ff00ff'));
	update_option('elementor_experiment-e_font_icon_svg', 'inactive');
}
delete_transient('elementor_activation_redirect');
update_option('elementor_onboarded', true);
nota_step('kit done');
flush_rewrite_rules();
nota_step('finished');
echo 'ok';
`;

/* Plugins and setup run after boot, not as blueprint steps: a failed step would stop
   the whole site, with no message saying why. */
const blueprint = {
  preferredVersions: { php, wp: "latest" },
  features: { networking: true },
  login: true,
  constants: { WP_DEBUG: true, WP_DEBUG_DISPLAY: true, WP_DEBUG_LOG: false },
};

/* --- Driving a page inside Playground's iframes ---------------------------------- */

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(120_000);

let consoleErrors = [];
let requested = [];
let booting = true;
page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
    if (booting) console.log(`      while starting: ${message.text().slice(0, 1800)}`);
  }
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));
page.on("request", (request) => requested.push(request.url()));

const wpFrame = () => page.frames().find((frame) => frame.url().includes("/scope:"));

async function waitForWp() {
  const deadline = Date.now() + 480_000;
  while (Date.now() < deadline) {
    const frame = wpFrame();
    if (frame) {
      const ready = await frame.evaluate(() => document.readyState === "complete" && !!document.body).catch(() => false);
      if (ready) return frame;
    }
    await page.waitForTimeout(1500);
  }
  throw new Error("WordPress never came up");
}

let scope = "";

async function goto(path) {
  for (let attempt = 1; ; attempt += 1) {
    const frame = await waitForWp();
    try {
      await frame.goto(`${scope}${path}`, { waitUntil: "load", timeout: 180_000 });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      note(`retrying ${path}: ${error.message.split("\n")[0]}`);
      await page.waitForTimeout(3000);
    }
  }
  await page.waitForTimeout(300);
  return waitForWp();
}

/* Grows the viewport to the page, since a full-page shot stops at the iframe's edge. */
async function shoot(name, width, full = true) {
  await page.setViewportSize({ width, height: 900 });
  const frame = await waitForWp();
  await frame.evaluate(() => window.scrollTo(0, 0));
  if (full) {
    const height = await frame.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width, height: Math.min(height, 14000) });
  }
  await frame.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => (image.complete ? null : new Promise((done) => { image.loading = "eager"; image.onload = image.onerror = done; setTimeout(done, 8000); }))));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${name}.png`) });
  await page.setViewportSize({ width, height: 900 });
}

const noOverflow = (frame) => frame.evaluate(() => {
  const limit = document.documentElement.clientWidth;
  const wide = [...document.querySelectorAll("body *")]
    .filter((el) => el.getBoundingClientRect().right > limit + 1 && getComputedStyle(el).position !== "fixed" && !el.closest(".frame--bleed,.tile__sidebar,.menu-sheet__panel,.shot-crop--main,.shot-crop--zen"))
    .slice(0, 4)
    .map((el) => el.tagName + "." + el.className);
  return { scroll: document.documentElement.scrollWidth, limit, wide };
});

async function axe(frame, label) {
  await frame.evaluate(axeSource);
  const violations = await frame.evaluate(async () => {
    /* A browser's own details are left closed: open them so their text is checked too. */
    document.querySelectorAll("details").forEach((el) => { if (!el.closest(".menu-sheet")) el.open = true; });
    const report = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] });
    document.querySelectorAll("details").forEach((el) => { el.open = false; });
    return report.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length}): ${v.nodes[0].target} | ${(v.nodes[0].any[0] || {}).message || v.help}`);
  });
  check(`axe: ${label}`, violations.length === 0, violations.join(" ;; "));
}

/* --- Run --------------------------------------------------------------------------- */

const started = Date.now();
const EMBED = `<!doctype html><meta charset="utf-8"><title>verify</title>
<style>html,body,iframe{display:block;width:100%;height:100%;margin:0;border:0}</style>
<iframe id="wp"></iframe>
<script type="module">
  import { startPlaygroundWeb } from "https://playground.wordpress.net/client/index.js";
  const blueprint = ${JSON.stringify(blueprint).replace(/</g, "\\u003c")};
  try {
    const client = await startPlaygroundWeb({ iframe: document.getElementById("wp"), remoteUrl: "https://playground.wordpress.net/remote.html", blueprint });
    await client.isReady();
    window.notaClient = client;
    window.notaReady = true;
  } catch (error) {
    window.notaBootError = error.message;
  }
</script>`;
/* A big download sometimes breaks off halfway, which says nothing about the theme. */
async function pluginZip(slug) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const upstream = await fetch(`https://downloads.wordpress.org/plugin/${slug}.latest-stable.zip`);
      if (!upstream.ok) throw new Error(`${slug}: ${upstream.status}`);
      return Buffer.from(await upstream.arrayBuffer());
    } catch (error) {
      if (attempt === 3) throw error;
      note(`retrying the ${slug} download: ${error.message}`);
    }
  }
}

const server = createServer(async (request, response) => {
  const plugin = request.url.match(/^\/plugin\/([a-z-]+)\.zip$/);
  if (plugin) {
    try {
      response.writeHead(200, { "Content-Type": "application/zip" }).end(await pluginZip(plugin[1]));
    } catch (error) {
      response.writeHead(502).end(error.message);
    }
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(EMBED);
}).listen(9412, "127.0.0.1");
await page.goto("http://localhost:9412/");
await page.waitForFunction(() => window.notaReady === true || window.notaBootError, null, { timeout: 180_000 });
const bootError = await page.evaluate(() => window.notaBootError);
if (bootError) throw new Error(`WordPress did not start: ${bootError}`);
booting = false;

async function runPhp(label, code) {
  const result = await page.evaluate(async (source) => {
    try {
      const response = await window.notaClient.run({ code: source });
      return { ok: true, text: response.text };
    } catch (error) {
      return { ok: false, text: `${error.message} ${error.response?.text ?? ""} ${error.response?.errors ?? ""}` };
    }
  }, code);
  check(`setup: ${label}`, result.ok, result.ok ? "" : result.text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 900));
  return result;
}

if (withPlugins) {
  for (const slug of ["elementor", "litespeed-cache"]) {
    const size = await page.evaluate(async (name) => {
      const bytes = new Uint8Array(await (await fetch(`/plugin/${name}.zip`)).arrayBuffer());
      await window.notaClient.writeFile(`/tmp/${name}.zip`, bytes);
      return bytes.length;
    }, slug);
    note(`${slug}: ${Math.round(size / 1048576)} MB`);
    await runPhp(`unpack ${slug}`, `<?php $zip = new ZipArchive(); $zip->open('/tmp/${slug}.zip'); $zip->extractTo('/wordpress/wp-content/plugins/'); $zip->close(); unlink('/tmp/${slug}.zip');`);
  }
  await runPhp("activate the plugins", ACTIVATE_PHP);
}
await page.evaluate(async (source) => {
  await window.notaClient.mkdir("/wordpress/wp-content/mu-plugins");
  await window.notaClient.writeFile("/wordpress/wp-content/mu-plugins/verify-as-visitor.php", source);
}, AS_VISITOR_PHP);
await runPhp("make the test content", SETUP_PHP);

let frame = await waitForWp();
scope = new URL(frame.url()).origin + new URL(frame.url()).pathname.match(/^\/scope:[^/]+/)[0];
note(`WordPress up after ${Math.round((Date.now() - started) / 1000)} s at ${scope}`);

frame = await goto("/nota-setup.txt");
const setupLog = await frame.evaluate(() => document.body.innerText);
note(`setup: ${setupLog.replace(/\n/g, " > ")}`);
check("the test site was set up", /finished/.test(setupLog) && !/FATAL/.test(setupLog), setupLog.slice(-300));

frame = await goto("/wp-admin/about.php");
const versions = await frame.evaluate(() => document.querySelector(".about__header-title, h1")?.textContent?.trim());
note(`WordPress says: ${versions}; PHP ${php}`);

/* The real form: Appearance, Themes, Add Theme, Upload Theme. */
frame = await goto("/wp-admin/theme-install.php");
await frame.locator(".upload-view-toggle").first().click();
await frame.locator("#themezip").setInputFiles(zip);
await frame.locator("#install-theme-submit").click();
await page.waitForTimeout(1500);
frame = await waitForWp();
await frame.locator("text=Theme installed successfully").waitFor({ timeout: 240_000 });
check("the zip installs through Upload Theme", true);
await frame.locator("a.activate, a:has-text('Activate')").first().click();
await page.waitForTimeout(1500);
frame = await waitForWp();
await frame.locator(".notice").first().waitFor();
const notice = await frame.locator(".notice").first().innerText();
check("activates, with the notice about where it went", /landing page is now your home page/.test(notice), notice.slice(0, 80));
await shoot("admin-activated", 1280, false);

/* --- The landing page -------------------------------------------------------------- */

for (const [lang, query] of [["en", "/?as_visitor=1"], ["am", "/?lang=am&as_visitor=1"]]) {
  consoleErrors = [];
  requested = [];
  frame = await goto(query);
  const facts = await frame.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    h1: document.querySelector("h1")?.textContent,
    h1Color: getComputedStyle(document.querySelector("h1")).color,
    bodyColor: getComputedStyle(document.body).color,
    bodyClass: document.body.className,
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href),
    scripts: [...document.scripts].map((script) => script.src).filter(Boolean),
    description: document.querySelector('meta[name="description"]')?.content,
    canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((link) => link.href),
    alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => `${link.hreflang}=${link.href}`),
    og: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')].map((meta) => [meta.getAttribute("property"), meta.content])),
    twitter: document.querySelector('meta[name="twitter:card"]')?.content,
    jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => script.textContent),
    text: document.body.innerText,
    html: document.documentElement.outerHTML,
    hasFooter: !!document.querySelector(".site-footer"),
    download: [...document.querySelectorAll(".dl-file")].map((a) => a.href),
    email: document.querySelector(".site-footer__email")?.getAttribute("href"),
    versionLabel: document.querySelector(".download__version")?.textContent,
    ethiopian: document.querySelector("[data-ethiopian-today]")?.textContent,
    gregorian: document.querySelector("[data-gregorian-today]")?.textContent,
    firstGroup: document.querySelector("[data-download-groups] .dl-group")?.dataset.os,
    fonts: [...document.fonts].filter((font) => font.status === "loaded").map((font) => font.family),
    ethiopicFontWorks: document.fonts.check('16px "Noto Sans Ethiopic"', "ሀ"),
  }));

  writeFileSync(join(out, `head-${lang}.html`), facts.html.slice(0, facts.html.indexOf("</head>")));
  check(`${lang}: the landing page replaces the Elementor home page`, facts.h1 && !/old home page/.test(facts.text), facts.h1);
  check(`${lang}: html lang`, facts.lang === lang, facts.lang);
  if (withPlugins) {
    check(`${lang}: the kit's magenta doesn't reach the page`, facts.h1Color !== "rgb(255, 0, 255)" && facts.bodyColor !== "rgb(255, 0, 255)", `h1 ${facts.h1Color}, body ${facts.bodyColor}`);
    check(`${lang}: no Elementor classes on body`, !/elementor/.test(facts.bodyClass), facts.bodyClass);
    check(`${lang}: no Elementor files`, ![...facts.stylesheets, ...facts.scripts].some((url) => /elementor|swiper|font-awesome|eicons|fonts\.googleapis/.test(url)), facts.stylesheets.join(" "));
  }
  check(`${lang}: no PHP notices in the page`, !/(<b>(Warning|Notice|Deprecated|Fatal error)<\/b>)/.test(facts.html), (facts.html.match(/<b>(Warning|Notice|Deprecated|Fatal error)<\/b>.{0,200}/) || [""])[0]);
  check(`${lang}: title`, /Nota/.test(facts.title), facts.title);
  check(`${lang}: description`, !!facts.description && facts.description.length <= (lang === "en" ? 160 : 170), `${facts.description?.length} chars`);
  check(`${lang}: one canonical, for this language`, facts.canonical.length === 1 && (lang === "am") === /lang=am/.test(facts.canonical[0]), facts.canonical.join(" "));
  check(`${lang}: hreflang en, am and x-default`, facts.alternates.length === 3, facts.alternates.join(" "));
  check(`${lang}: Open Graph`, !!facts.og["og:title"] && !!facts.og["og:image"] && facts.og["og:locale"] === (lang === "am" ? "am_ET" : "en_US"), JSON.stringify(facts.og).slice(0, 240));
  check(`${lang}: Twitter card`, facts.twitter === "summary_large_image");

  let graph = [];
  try {
    graph = JSON.parse(facts.jsonld[0])["@graph"];
  } catch (error) {
    note(String(error));
  }
  const app = graph.find((item) => item["@type"] === "SoftwareApplication");
  check(`${lang}: JSON-LD parses, with the application`, !!app && app.offers?.price === "0" && !app.aggregateRating, graph.map((item) => item["@type"]).join(", "));
  check(`${lang}: nothing invented in JSON-LD`, !/aggregateRating|review/i.test(facts.jsonld[0]));
  check(`${lang}: JSON-LD FAQ matches the page`, (graph.find((item) => item["@type"] === "FAQPage")?.mainEntity ?? []).every((q) => facts.text.includes(q.name)));

  check(`${lang}: no em or en dashes in the page`, !/[–—]/.test(facts.text), (facts.text.match(/.{0,30}[–—].{0,30}/) || [""])[0]);
  check(`${lang}: six real release links`, facts.download.length === 6 && facts.download.every((url) => /^https:\/\/github\.com\/rabira-hierpa\/Nota\/releases\/download\/v0\.3\.0\/Nota-0\.3\.0-/.test(url)), facts.download[0]);
  check(`${lang}: the version label reads properly`, /^\S+ 0\.3\.0$/.test(facts.versionLabel ?? ""), facts.versionLabel);
  const sharing = await frame.evaluate(async () => {
    const url = document.querySelector('meta[property="og:image"]').content;
    const image = new Image();
    image.src = url;
    await image.decode();
    return `${image.naturalWidth}x${image.naturalHeight}`;
  });
  check(`${lang}: the sharing picture loads at its stated size`, sharing === "1200x630", sharing);
  check(`${lang}: no requests to font services`, !requested.some((url) => /fonts\.(googleapis|gstatic)\.com/.test(url)));
  check(`${lang}: Ge'ez font loads`, facts.fonts.includes("Noto Sans Ethiopic") && facts.ethiopicFontWorks, facts.fonts.join(", "));
  check(`${lang}: today in both calendars`, !!facts.ethiopian && !!facts.gregorian, `${facts.ethiopian} / ${facts.gregorian}`);
  note(`mail link ${facts.email}; first download group on this system: ${facts.firstGroup}`);

  for (const [width, label] of [[1440, "desktop"], [820, "tablet"], [390, "phone"], [360, "small"]]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    const overflow = await noOverflow(frame);
    check(`${lang}: no sideways scroll at ${width}`, overflow.scroll <= overflow.limit && overflow.wide.length === 0, `${overflow.scroll}/${overflow.limit} ${overflow.wide.join(", ")}`);
    if (label === "tablet" && lang === "en") await shoot("landing-en-tablet-light", width);
    if (label === "desktop" || label === "phone") {
      for (const scheme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.waitForTimeout(200);
        await shoot(`landing-${lang}-${label}-${scheme}`, width);
        await page.setViewportSize({ width, height: 844 });
        await axe(frame, `${lang} ${label} ${scheme}`);
      }
      await page.emulateMedia({ colorScheme: "light" });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  const realErrors = consoleErrors.filter((text) => !/favicon|service worker|Failed to load resource.*(cors-proxy)/i.test(text));
  check(`${lang}: no console errors`, realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
}

/* --- What the script does ----------------------------------------------------------- */

frame = await goto("/?as_visitor=1");
await page.setViewportSize({ width: 1440, height: 900 });
await frame.locator("[data-theme-toggle]").click();
const toggled = await frame.evaluate(() => ({
  theme: document.documentElement.getAttribute("data-theme"),
  bg: getComputedStyle(document.body).backgroundColor,
  media: document.querySelector("picture.shot-img source").media,
  stored: localStorage.getItem("nota-site-theme"),
}));
check("the theme toggle switches colours and pictures", toggled.theme === "dark" && toggled.bg === "rgb(21, 27, 23)" && toggled.media === "all", JSON.stringify(toggled));
await frame.goto(`${scope}/?lang=am&as_visitor=1`, { waitUntil: "load" });
frame = await waitForWp();
const kept = await frame.evaluate(() => document.documentElement.getAttribute("data-theme"));
check("the chosen theme survives moving to the other language", kept === "dark", String(kept));
await frame.locator("[data-theme-toggle]").click();
await frame.evaluate(() => localStorage.removeItem("nota-site-theme"));

frame = await goto("/");
await frame.locator("[data-clip]").scrollIntoViewIfNeeded();
await page.waitForTimeout(3500);
const clip = await frame.evaluate(() => {
  const figure = document.querySelector("[data-clip]");
  const video = figure.querySelector("video");
  return { playing: figure.classList.contains("is-playing"), paused: video.paused, time: video.currentTime, src: video.currentSrc.split("/").pop(), error: video.error?.message };
});
check("the dictation clip plays when it scrolls into view", clip.playing && !clip.paused && clip.time > 0, JSON.stringify(clip));
await frame.locator("[data-clip-toggle]").click();
const stopped = await frame.evaluate(() => ({ paused: document.querySelector("[data-clip] video").paused, label: document.querySelector("[data-clip-toggle]").getAttribute("aria-label") }));
check("the clip's pause button pauses it", stopped.paused, stopped.label);

await page.emulateMedia({ reducedMotion: "reduce" });
frame = await goto("/");
await frame.locator("[data-clip]").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
const still = await frame.evaluate(() => ({ playing: document.querySelector("[data-clip]").classList.contains("is-playing"), src: document.querySelector("[data-clip] video").getAttribute("src") }));
check("with reduced motion the clip stays a picture", !still.playing && !still.src, JSON.stringify(still));
await page.emulateMedia({ reducedMotion: "no-preference" });

await page.setViewportSize({ width: 390, height: 844 });
frame = await goto("/?as_visitor=1");
await frame.locator(".menu-sheet > summary").click();
await page.waitForTimeout(250);
await page.screenshot({ path: join(out, "menu-open-phone.png") });
await frame.locator(".menu-sheet__panel a[href='#privacy']").click();
await page.waitForTimeout(2000);
const menu = await frame.evaluate(() => ({ open: document.querySelector(".menu-sheet").hasAttribute("open"), top: Math.round(document.querySelector("#privacy").getBoundingClientRect().top) }));
check("the phone menu opens, jumps to a section and closes", !menu.open && menu.top < 200, JSON.stringify(menu));
await page.setViewportSize({ width: 1440, height: 900 });

/* --- The Customizer: an edit with no PHP ---------------------------------------------- */

async function customize(values) {
  frame = await goto("/wp-admin/customize.php");
  await frame.waitForFunction(() => window.wp?.customize?.state && window.wp.customize.state("saved"));
  await page.waitForTimeout(2500);
  await frame.evaluate((entries) => {
    for (const [key, value] of Object.entries(entries)) window.wp.customize(key).set(value);
  }, values);
  await page.waitForTimeout(800);
  await frame.locator("#save").click();
  await frame.waitForFunction(() => window.wp.customize.state("saved").get() === true, null, { timeout: 120_000 });
}

frame = await goto("/wp-admin/customize.php?autofocus[panel]=nota_landing");
await frame.waitForFunction(() => window.wp?.customize?.panel && window.wp.customize.panel("nota_landing"));
await page.waitForTimeout(3000);
const panel = await frame.evaluate(() => ({
  sections: window.wp.customize.panel("nota_landing").sections().map((section) => section.params.title),
  controls: Object.keys(window.wp.customize.settings.controls).filter((key) => key.startsWith("nota_")).length,
}));
check("the Customizer has the panel", panel.sections.length >= 10, `${panel.controls} controls in: ${panel.sections.join(", ")}`);
await page.screenshot({ path: join(out, "customizer.png") });

await customize({ nota_hero_title_en: "An edited headline, with no PHP.", nota_hero_title_am: "የተቀየረ ርዕስ።", nota_version: "9.9.9", nota_hero_secondary_en: "", nota_android_url: "https://example.com/nota.apk" });
frame = await goto("/");
const edited = await frame.evaluate(() => ({
  h1: document.querySelector("h1").textContent,
  link: document.querySelector(".dl-file").href,
  secondary: !!document.querySelector(".button--quiet"),
  android: document.querySelector(".device__actions .button--primary")?.href,
}));
check("a published English edit shows on the page", edited.h1 === "An edited headline, with no PHP.", edited.h1);
check("one version field moves every download link", edited.link.includes("/v9.9.9/Nota-9.9.9-"), edited.link);
check("emptying a field hides that text", edited.secondary === false);
check("adding the Android link shows its button", edited.android === "https://example.com/nota.apk", String(edited.android));
frame = await goto("/?lang=am");
const editedAm = await frame.evaluate(() => document.querySelector("h1").textContent);
check("a published Amharic edit shows on the Amharic page", editedAm === "የተቀየረ ርዕስ።", editedAm);

if (withPlugins) {
  /* The leak test above means something only if the kit does colour a page it may reach. */
  frame = await goto("/built/?as_visitor=1");
  const control = await frame.evaluate(() => ({
    body: getComputedStyle(document.body).color,
    classes: document.body.className,
    stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href),
    chrome: [".site-header .brand__name", ".theme-toggle", ".site-footer .brand__name", ".site-footer__email"].map((selector) => getComputedStyle(document.querySelector(selector)).color),
  }));
  check("control: the kit's magenta does reach an Elementor page", control.body === "rgb(255, 0, 255)", `body ${control.body}; ${control.classes}; ${control.stylesheets.filter((url) => /elementor/.test(url)).map((url) => url.split("/").pop()).join(" ")}`);

  check("an Elementor page keeps the theme's own header and footer colours", !control.chrome.includes("rgb(255, 0, 255)"), control.chrome.join(", "));

  frame = await goto("/coming-soon/?as_visitor=1");
  note(`while the landing page is on, the old page's own address shows: ${await frame.evaluate(() => (document.querySelector(".landing") ? "the landing page" : "the old page"))}`);

  await customize({ nota_front_mode: "page" });
  frame = await goto("/?as_visitor=1");
  const rollback = await frame.evaluate(() => ({ text: document.body.innerText, landing: !!document.querySelector(".landing"), classes: document.body.className, html: document.documentElement.outerHTML }));
  check("rollback: the Customizer brings the old home page back", !rollback.landing && /old home page/.test(rollback.text), rollback.text.slice(0, 80));
  check("rollback: it is Elementor's page again", /elementor-page|elementor-template-canvas/.test(rollback.classes), rollback.classes);
  check("rollback: no PHP notices", !/<b>(Warning|Notice|Deprecated|Fatal error)<\/b>/.test(rollback.html), (rollback.html.match(/<b>(Warning|Notice|Deprecated|Fatal error)<\/b>.{0,200}/) || [""])[0]);
  await shoot("other-old-home-page-desktop", 1280, false);
  await page.setViewportSize({ width: 1440, height: 900 });
  await customize({ nota_front_mode: "landing" });
  frame = await goto("/?as_visitor=1");
  check("rollback: and the landing page comes back after it", await frame.evaluate(() => !!document.querySelector(".landing")));
}

await customize({ nota_hero_title_en: "Amharic notes you can write or speak.", nota_hero_title_am: "የአማርኛ ማስታወሻ፣ በመጻፍም በመናገርም።", nota_version: "0.3.0", nota_hero_secondary_en: "See how it works", nota_android_url: "" });

/* --- The rest of the site -------------------------------------------------------------- */

const others = [
  ["/about/", "page", /An ordinary page/],
  ["/blog/", "blog", /የመጀመሪያው ጽሑፍ/],
  ["/first/", "post", /የሙከራ ጽሑፍ/],
  ["/?s=%E1%8C%BD%E1%88%91%E1%8D%8D", "search", /የመጀመሪያው ጽሑፍ/],
  ["/nothing-here/", "404", /not here/],
];
if (withPlugins) others.push(["/built/", "elementor-page", /A page in the builder/]);

for (const [path, name, expected] of others) {
  frame = await goto(`${path}${path.includes("?") ? "&" : "?"}as_visitor=1`);
  const seen = await frame.evaluate(() => ({ text: document.body.innerText, html: document.documentElement.outerHTML, h1: getComputedStyle(document.querySelector("h1") ?? document.body).color }));
  check(`${name} renders`, expected.test(seen.text), seen.text.slice(0, 60).replace(/\s+/g, " "));
  check(`${name}: no PHP notices`, !/<b>(Warning|Notice|Deprecated|Fatal error)<\/b>/.test(seen.html), (seen.html.match(/<b>(Warning|Notice|Deprecated|Fatal error)<\/b>.{0,200}/) || [""])[0]);
  await shoot(`other-${name}-desktop`, 1280, false);
  await shoot(`other-${name}-phone`, 390, false);
  await page.setViewportSize({ width: 1440, height: 900 });
}

/* --- The outcome -------------------------------------------------------------------------- */

const failed = results.filter((result) => !result.passed);
writeFileSync(join(out, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length} of ${results.length} passed, after ${Math.round((Date.now() - started) / 1000)} s`);
for (const failure of failed) console.log(`FAILED  ${failure.name}: ${failure.detail}`);
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
