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
 *
 * The release notes and download counts are checked against GitHub's own API, read
 * at the same time. Umami's real script runs on the page, and what it would send is
 * caught here, so nothing reaches Umami.
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
/* A visitor stays one through a redirect, such as the beta form's thank-you. */
add_filter('wp_redirect', function ($location) { return isset($_GET['as_visitor']) && false === strpos($location, 'as_visitor') ? add_query_arg('as_visitor', '1', $location) : $location; });
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

/* Counts the server's requests to GitHub, to show that pages are served from the cache. */
const GITHUB_CALLS_PHP = `<?php
add_action('http_api_debug', function ($response, $context, $class, $args, $url) {
	if (false !== strpos($url, 'api.github.com/')) {
		update_option('verify_github_calls', (int) get_option('verify_github_calls', 0) + 1, false);
		update_option('verify_github_last', (is_wp_error($response) ? $response->get_error_message() : wp_remote_retrieve_response_code($response)) . ' ' . $url, false);
	}
}, 10, 5);
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

/* One part of a page, cut from a full-page shot (element shots come out blank through
   Playground's nested frames). */
async function shootPart(name, selector, width) {
  await shoot(name, width);
  const frame = await waitForWp();
  const height = await frame.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: Math.min(height, 14000) });
  const box = await frame.evaluate((sel) => {
    const rect = document.querySelector(sel).getBoundingClientRect();
    return { y: rect.top + window.scrollY, height: rect.height };
  }, selector);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, `${name}.png`), clip: { x: 0, y: Math.max(0, box.y - 24), width, height: box.height + 48 } });
  await page.setViewportSize({ width, height: 900 });
}

const noOverflow = (frame) => frame.evaluate(() => {
  const limit = document.documentElement.clientWidth;
  const wide = [...document.querySelectorAll("body *")]
    .filter((el) => el.getBoundingClientRect().right > limit + 1 && getComputedStyle(el).position !== "fixed" && !el.closest(".frame--bleed,.tile__sidebar,.menu-sheet__panel,.shot-crop--main,.shot-crop--zen,.ticker__track"))
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
await page.evaluate(async (source) => {
  await window.notaClient.writeFile("/wordpress/wp-content/mu-plugins/verify-github-calls.php", source);
}, GITHUB_CALLS_PHP);
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

const band = await frame.evaluate(() => {
  const ticker = document.querySelector("[data-ticker]");
  const track = ticker?.querySelector(".ticker__track");
  return {
    live: !!ticker?.classList.contains("is-live"),
    moving: !!track && getComputedStyle(track).animationName === "nota-drift" && getComputedStyle(track).animationPlayState === "running",
    hiddenCopy: ticker?.querySelectorAll(".ticker__list[aria-hidden='true']").length,
    anywhere: !!document.querySelector("#anywhere .steps li") && document.querySelectorAll("#anywhere .way").length === 2,
    badge: document.querySelector("#anywhere .badge")?.textContent.trim(),
    navLink: !!document.querySelector(".site-nav a[href$='#anywhere']"),
  };
});
check("the band of phrases moves, with its copy hidden from screen readers", band.live && band.moving && band.hiddenCopy === 1, JSON.stringify(band));
check("the any-app section shows its steps, both ways and its badge, and the menu links to it", band.anywhere && !!band.badge && band.navLink, JSON.stringify(band));
await frame.locator("[data-ticker-toggle]").click();
const bandPaused = await frame.evaluate(() => ({ state: getComputedStyle(document.querySelector(".ticker__track")).animationPlayState, pressed: document.querySelector("[data-ticker-toggle]").getAttribute("aria-pressed") }));
check("the band's button pauses it", bandPaused.state === "paused" && bandPaused.pressed === "true", JSON.stringify(bandPaused));

await page.emulateMedia({ reducedMotion: "reduce" });
frame = await goto("/");
await frame.locator("[data-clip]").scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
const still = await frame.evaluate(() => ({ playing: document.querySelector("[data-clip]").classList.contains("is-playing"), src: document.querySelector("[data-clip] video").getAttribute("src") }));
check("with reduced motion the clip stays a picture", !still.playing && !still.src, JSON.stringify(still));
const stillBand = await frame.evaluate(() => ({ live: document.querySelector("[data-ticker]").classList.contains("is-live"), button: getComputedStyle(document.querySelector("[data-ticker-toggle]")).display !== "none", animation: getComputedStyle(document.querySelector(".ticker__track")).animationName }));
check("with reduced motion the band of phrases stands still", !stillBand.live && !stillBand.button && stillBand.animation === "none", JSON.stringify(stillBand));
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
  secondary: !!document.querySelector(".hero .button--quiet"),
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

/* --- Release notes, download counts and visits ------------------------------------------- */

/* What GitHub itself says, to hold the page to. Read just before, so the counts match. */
const isMeta = (name) => /\.(blockmap|ya?ml|sha256|sha512|sig|asc|txt)$/i.test(name);
const ghList = await (await fetch("https://api.github.com/repos/rabira-hierpa/Nota/releases?per_page=100", { headers: { "User-Agent": "nota-verify", Accept: "application/vnd.github+json" } })).json();
const ghReleases = ghList.filter((release) => !release.draft).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
const ghCount = (release) => release.assets.filter((asset) => !isMeta(asset.name)).reduce((sum, asset) => sum + asset.download_count, 0);
const ghTotal = ghReleases.reduce((sum, release) => sum + ghCount(release), 0);
const fmt = (n) => n.toLocaleString("en-US");
note(`GitHub says: ${ghReleases.map((release) => `${release.tag_name} (${ghCount(release)})`).join(", ")}; ${ghTotal} downloads in all`);

const cleaned = await runPhp("release notes go through the cleaner", `<?php require_once '/wordpress/wp-load.php';
$html = '<h2>Hi <a href="#hi" class="anchor">#</a></h2><p onclick="steal()">A <a href="javascript:alert(1)">bad</a> and <a href="https://example.com/x" target="_blank" onmouseover="steal()">fine</a> link.</p><script>alert("s")</script><img src="https://example.com/t.png" onerror="steal()"><iframe src="https://example.com"></iframe><style>body{display:none}</style><table><tr><th align="left">c</th></tr></table><h2>አማርኛ</h2><p>ሰላም</p><h3>ዝርዝር</h3><p>ተጨማሪ</p><h2>After</h2><p>tail</p>';
echo wp_json_encode( nota_release_notes_split( $html ) );`);
let split = { en: "", am: "" };
try {
  split = JSON.parse(cleaned.text);
} catch {
  note(`cleaner said: ${cleaned.text.slice(0, 300)}`);
}
const both = split.en + split.am;
check("notes: no scripts, handlers, frames, styles, pictures or javascript: links", !/<script|<iframe|<style|<img|on(click|error|mouseover)=|javascript:|steal|alert|target=/i.test(both) && /A bad and/.test(split.en), both.slice(0, 300));
check("notes: headings start at h3, permalink anchors go, tables get their box", /<h3>Hi\s*<\/h3>/.test(split.en) && !/class="anchor"/.test(split.en) && /<div class="release-table"><table>/.test(split.en), split.en.slice(0, 200));
check("notes: links to other sites stay", /<a href="https:\/\/example\.com\/x">fine<\/a>/.test(split.en), split.en.match(/<a [^>]*>fine/)?.[0] ?? "");
check("notes: the section headed አማርኛ goes to the Amharic page only", /ሰላም/.test(split.am) && /<h3>ዝርዝር<\/h3>/.test(split.am) && /ተጨማሪ/.test(split.am) && !/After/.test(split.am) && !/ሰላም/.test(split.en) && /After/.test(split.en) && /tail/.test(split.en), JSON.stringify(split).slice(0, 300));

await runPhp("make the release notes page", `<?php require_once '/wordpress/wp-load.php';
wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'Release notes','post_name'=>'releases','post_content'=>''));
delete_option('nota_github_releases'); delete_transient('nota_github_fresh'); update_option('verify_github_calls', 0);
echo 'ok';`);

const githubCalls = async () => {
  const result = await runPhp("read the GitHub request count", `<?php require_once '/wordpress/wp-load.php'; $d = get_option('nota_github_releases'); echo wp_json_encode(array('calls' => (int) get_option('verify_github_calls'), 'last' => get_option('verify_github_last'), 'error' => is_array($d) ? $d['error'] : null, 'etag' => is_array($d) ? $d['etag'] : null, 'releases' => is_array($d) ? count($d['releases']) : null, 'fresh' => (bool) get_transient('nota_github_fresh')));`);
  try {
    return JSON.parse(result.text);
  } catch {
    return { calls: -1, raw: result.text.slice(0, 200) };
  }
};

const releaseFacts = (frame) => frame.evaluate(() => ({
  lang: document.documentElement.lang,
  title: document.title,
  h1: document.querySelector("h1")?.textContent.trim(),
  colors: [document.querySelector("h1"), document.body, document.querySelector(".release__notes")].filter(Boolean).map((el) => getComputedStyle(el).color),
  assets: [...document.querySelectorAll('link[rel="stylesheet"]'), ...document.querySelectorAll("script[src]")].map((el) => el.href || el.src),
  intro: document.querySelector(".page-intro")?.textContent.trim(),
  titles: [...document.querySelectorAll(".release__title")].map((el) => el.textContent.trim()),
  ids: [...document.querySelectorAll(".release")].map((el) => el.id),
  badge: document.querySelector(".release .release__badge")?.textContent.trim(),
  dates: [...document.querySelectorAll(".release time")].map((el) => `${el.getAttribute("datetime")}|${el.textContent.trim()}`),
  github: [...document.querySelectorAll(".release__links a.text-link")].map((a) => a.href),
  cta: document.querySelector(".release__links .button")?.getAttribute("href"),
  firstNotes: document.querySelector(".release__notes")?.innerHTML ?? "",
  notesLang: document.querySelector(".release__notes")?.getAttribute("lang"),
  langNote: document.querySelector(".release__lang-note")?.textContent.trim(),
  counts: [...document.querySelectorAll(".release__count")].map((el) => el.textContent.trim()),
  scriptsInNotes: document.querySelectorAll(".release__notes script, .release__notes img, .release__notes iframe").length,
  canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((link) => link.href),
  alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => `${link.hreflang}=${link.href}`),
  descriptions: [...document.querySelectorAll('meta[name="description"]')].map((meta) => meta.content),
  switchEn: document.querySelector('.lang-switch a[hreflang="en"]')?.href,
  switchAm: document.querySelector('.lang-switch a[hreflang="am"]')?.href,
  empty: document.querySelector(".releases__empty")?.textContent.trim(),
  html: document.documentElement.outerHTML,
}));
const notices = (html) => (html.match(/<b>(Warning|Notice|Deprecated|Fatal error)<\/b>.{0,200}/) || [""])[0];

for (const [lang, query] of [["en", "/releases/?as_visitor=1"], ["am", "/releases/?lang=am&as_visitor=1"]]) {
  consoleErrors = [];
  frame = await goto(query);
  const facts = await releaseFacts(frame);
  const v030 = facts.dates[facts.ids.indexOf("release-v0-3-0")] ?? "";
  check(`releases ${lang}: no PHP notices`, !notices(facts.html), notices(facts.html));
  check(`releases ${lang}: html lang`, facts.lang === lang, facts.lang);
  check(`releases ${lang}: every GitHub release, newest first, by name`, JSON.stringify(facts.titles) === JSON.stringify(ghReleases.slice(0, 10).map((release) => release.name || release.tag_name)), facts.titles.join(", "));
  check(`releases ${lang}: each links to its GitHub release`, JSON.stringify(facts.github) === JSON.stringify(ghReleases.slice(0, 10).map((release) => release.html_url)), facts.github[0]);
  check(`releases ${lang}: the newest says it is the latest, with a download button`, facts.badge === (lang === "am" ? "የቅርብ ጊዜው" : "Latest") && /#download$/.test(facts.cta ?? ""), `${facts.badge} ${facts.cta}`);
  check(`releases ${lang}: notes rendered from GitHub's Markdown`, /<h3>What's new<\/h3>|<h3>What’s new<\/h3>/.test(facts.firstNotes) || /<h3>/.test(facts.firstNotes), facts.firstNotes.slice(0, 120));
  check(`releases ${lang}: no scripts or pictures in the notes`, facts.scriptsInNotes === 0);
  check(`releases ${lang}: the 0.3.0 date`, v030 === (lang === "am" ? "2026-11-02|ጥቅምት 23፣ 2019" : "2026-11-02|2 November 2026"), v030);
  check(`releases ${lang}: one canonical, for this language`, facts.canonical.length === 1 && /\/releases\//.test(facts.canonical[0]) && (lang === "am") === /lang=am/.test(facts.canonical[0]), facts.canonical.join(" "));
  check(`releases ${lang}: hreflang en, am and x-default on this page`, facts.alternates.length === 3 && facts.alternates.every((alt) => /\/releases\//.test(alt)), facts.alternates.join(" "));
  check(`releases ${lang}: one description, from the intro`, facts.descriptions.length === 1 && facts.descriptions[0] === facts.intro, facts.descriptions.join(" | "));
  check(`releases ${lang}: the language switch stays on this page`, /\/releases\/$/.test(facts.switchEn ?? "") && /\/releases\/\?lang=am$/.test(facts.switchAm ?? ""), `${facts.switchEn} ${facts.switchAm}`);
  check(`releases ${lang}: no download numbers until they are switched on`, facts.counts.length === 0);
  if (withPlugins) {
    check(`releases ${lang}: the kit's magenta and Elementor's files stay off`, !facts.colors.includes("rgb(255, 0, 255)") && !facts.assets.some((url) => /elementor|swiper|font-awesome|eicons|fonts\.googleapis/.test(url)), `${facts.colors.join(", ")} ${facts.assets.filter((url) => /elementor/.test(url)).join(" ")}`);
  }
  if (lang === "en") {
    check("releases en: heading and title", facts.h1 === "Release notes" && /^Release notes/.test(facts.title), `${facts.h1} / ${facts.title}`);
  } else {
    check("releases am: Amharic heading and title, notes marked as English", facts.h1 === "የስሪት ማስታወሻዎች" && /^የስሪት ማስታወሻዎች/.test(facts.title) && facts.notesLang === "en" && facts.langNote === "የዚህ ስሪት ማስታወሻ በእንግሊዝኛ ብቻ ነው።", `${facts.h1} / ${facts.title} / ${facts.notesLang} / ${facts.langNote}`);
  }

  for (const [width, label] of [[1440, "desktop"], [820, "tablet"], [390, "phone"], [360, "small"]]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    const overflow = await noOverflow(frame);
    check(`releases ${lang}: no sideways scroll at ${width}`, overflow.scroll <= overflow.limit && overflow.wide.length === 0, `${overflow.scroll}/${overflow.limit} ${overflow.wide.join(", ")}`);
    if (label === "desktop" || label === "phone") {
      for (const scheme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.waitForTimeout(200);
        await shoot(`releases-${lang}-${label}-${scheme}`, width);
        await page.setViewportSize({ width, height: 844 });
        await axe(frame, `releases ${lang} ${label} ${scheme}`);
      }
      await page.emulateMedia({ colorScheme: "light" });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const realErrors = consoleErrors.filter((text) => !/favicon|service worker|Failed to load resource.*(cors-proxy)/i.test(text));
  check(`releases ${lang}: no console errors`, realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
}

frame = await goto("/releases/?as_visitor=1");
let calls = await githubCalls();
note(`GitHub: ${JSON.stringify(calls)}`);
check("cache: three page views asked GitHub once", calls.calls === 1 && calls.fresh && calls.releases === ghReleases.length && calls.error === "", JSON.stringify(calls));

frame = await goto("/?as_visitor=1");
const whatsNew = await frame.evaluate(() => [...document.querySelectorAll(".download__head a.text-link")].map((a) => `${a.textContent.trim()}|${a.getAttribute("href")}`));
check("landing: What's new links to the version on the release notes page", whatsNew.some((link) => /^What's new in 0\.3\.0\|.*\/releases\/#release-v0-3-0$/.test(link)), whatsNew.join(" "));
frame = await goto("/?lang=am&as_visitor=1");
const whatsNewAm = await frame.evaluate(() => document.querySelector(".download__head a.text-link")?.getAttribute("href"));
check("landing am: and to the Amharic release notes", /\/releases\/\?lang=am#release-v0-3-0$/.test(whatsNewAm ?? ""), whatsNewAm);

/* The Dashboard box, against GitHub's own numbers. */
frame = await goto("/wp-admin/index.php");
const widget = await frame.evaluate(() => document.querySelector("#nota_downloads")?.innerText ?? "");
check("dashboard: the downloads box shows GitHub's total", widget.includes(fmt(ghTotal)) && widget.includes(ghReleases[0].tag_name), widget.slice(0, 200).replace(/\s+/g, " "));
await frame.locator("#nota_downloads").scrollIntoViewIfNeeded();
await frame.locator("#nota_downloads").screenshot({ path: join(out, "dashboard-downloads.png") });
await frame.locator("#nota_downloads a.button").click();
/* The button goes through admin-post.php and back: wait for the Dashboard it returns to. */
for (let i = 0; i < 60 && !/nota_github=/.test(wpFrame()?.url() ?? ""); i += 1) await page.waitForTimeout(1000);
frame = await waitForWp();
await frame.locator("#nota_downloads").waitFor();
const refreshed = await frame.evaluate(() => document.querySelector("#nota_downloads")?.innerText ?? "");
calls = await githubCalls();
check("dashboard: Ask GitHub now asks again", /Asked GitHub again/.test(refreshed) && calls.calls === 2, `${calls.calls} calls; last ${calls.last}; ${refreshed.slice(0, 80).replace(/\s+/g, " ")}`);

/* Download numbers on the page, once switched on. */
await customize({ nota_show_downloads: true });
frame = await goto("/?as_visitor=1");
const shown = await frame.evaluate(() => document.querySelector(".download__count")?.textContent.trim());
check("landing: with numbers on, the total shows under the version", shown === `${fmt(ghTotal)} downloads so far`, String(shown));
await shootPart("landing-download-with-count-desktop", "#download", 1440);
await shootPart("landing-download-with-count-phone", "#download", 390);
await page.setViewportSize({ width: 1440, height: 900 });
frame = await goto("/?lang=am&as_visitor=1");
const shownAm = await frame.evaluate(() => document.querySelector(".download__count")?.textContent.trim());
check("landing am: and in Amharic", shownAm === `እስካሁን ${fmt(ghTotal)} ጊዜ ወርዷል`, String(shownAm));
frame = await goto("/releases/?as_visitor=1");
const perRelease = (await releaseFacts(frame)).counts;
check("releases: with numbers on, each version's count", JSON.stringify(perRelease) === JSON.stringify(ghReleases.slice(0, 10).map((release) => `${fmt(ghCount(release))} download${ghCount(release) === 1 ? "" : "s"}`)), perRelease.join(", "));
await shoot("releases-en-desktop-light-with-counts", 1440, false);
await page.setViewportSize({ width: 1440, height: 900 });
calls = await githubCalls();
check("cache: none of those pages asked GitHub", calls.calls === 2, JSON.stringify(calls));
await customize({ nota_show_downloads: false });

/* GitHub out of reach, or a wrong link: a message, no notices. */
await customize({ nota_github_url: "https://github.com/rabira-hierpa/nota-verify-no-such-repository" });
frame = await goto("/releases/?as_visitor=1");
const broken = await releaseFacts(frame);
check("releases: a repository that isn't there gives a message", !!broken.empty && broken.titles.length === 0 && !notices(broken.html), `${broken.empty} ${notices(broken.html)}`);
frame = await goto("/wp-admin/index.php");
const brokenWidget = await frame.evaluate(() => document.querySelector("#nota_downloads")?.innerText ?? "");
check("dashboard: and says why", /no public repository/.test(brokenWidget), brokenWidget.slice(0, 160).replace(/\s+/g, " "));
await customize({ nota_github_url: "https://github.com/rabira-hierpa/Nota" });
frame = await goto("/releases/?as_visitor=1");
check("releases: back on the right repository, the notes come back", (await releaseFacts(frame)).titles.length === Math.min(10, ghReleases.length));

/* Counting visits and clicks. Umami's real script runs; what it sends is caught here. */
frame = await goto("/wp-admin/customize.php?autofocus[section]=nota_stats");
await frame.waitForFunction(() => window.wp?.customize?.section && window.wp.customize.section("nota_stats"));
await page.waitForTimeout(3000);
const statsControls = await frame.evaluate(() => window.wp.customize.section("nota_stats").controls().map((control) => control.id));
check("customizer: Visits and downloads has its four fields", ["nota_umami_id", "nota_umami_src", "nota_cf_token", "nota_show_downloads"].every((id) => statsControls.includes(id)), statsControls.join(", "));
await page.screenshot({ path: join(out, "customizer-visits.png") });

const FAKE_UMAMI = "00000000-0000-4000-8000-000000000000";
const umamiSent = [];
/* The script posts to gateway.umami.is today; any Umami host is caught. */
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
await context.route(/^https:\/\/[a-z-]+\.umami\.is\/api\/send/, async (route) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS });
    return;
  }
  try {
    umamiSent.push(route.request().postDataJSON());
  } catch {
    umamiSent.push({ raw: route.request().postData() });
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: "{}", headers: CORS });
});
await context.route("https://static.cloudflareinsights.com/**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stand-in */" }));

await customize({ nota_umami_id: `  ${FAKE_UMAMI.toUpperCase()} `, nota_cf_token: "<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"0123456789abcdef0123456789abcdef\"}'></script>" });
frame = await goto("/");
const asEditor = await frame.evaluate(() => ({ scripts: document.querySelectorAll("script[data-website-id], script[data-cf-beacon]").length, tracked: document.querySelectorAll(".dl-file[data-umami-event]").length }));
check("analytics: nothing counts the site's own editors", asEditor.scripts === 0 && asEditor.tracked === 6, JSON.stringify(asEditor));

frame = await goto("/?as_visitor=1");
const tracking = await frame.evaluate(() => {
  const umami = document.querySelector("script[data-website-id]");
  const cf = document.querySelector("script[data-cf-beacon]");
  return {
    umami: umami && { src: umami.src, id: umami.dataset.websiteId, domains: umami.dataset.domains, dnt: umami.dataset.doNotTrack, defer: umami.defer },
    host: location.hostname,
    cf: cf && cf.getAttribute("data-cf-beacon"),
    platforms: [...document.querySelectorAll(".dl-file")].map((a) => `${a.dataset.umamiEvent}:${a.dataset.umamiEventPlatform}`).sort(),
  };
});
check("analytics: Umami's script, with the ID cleaned up, this site's domains and Do Not Track", !!tracking.umami && tracking.umami.src === "https://cloud.umami.is/script.js" && tracking.umami.id === FAKE_UMAMI && tracking.umami.domains.split(",").includes(tracking.host) && tracking.umami.dnt === "true" && tracking.umami.defer, JSON.stringify(tracking.umami));
check("analytics: Cloudflare's beacon, with the token picked out of a pasted snippet", tracking.cf === '{"token":"0123456789abcdef0123456789abcdef"}', String(tracking.cf));
check("analytics: each download link is a Download event with its build", JSON.stringify(tracking.platforms) === JSON.stringify(["Download:linux-arm64", "Download:linux-x64", "Download:mac-arm64", "Download:mac-x64", "Download:win-arm64", "Download:win-x64"]), tracking.platforms.join(" "));

await frame.waitForFunction(() => !!window.umami, null, { timeout: 30_000 }).catch(() => note("Umami's script did not load"));
for (let i = 0; i < 20 && !umamiSent.some((sent) => sent?.type === "event" && !sent.payload?.name); i += 1) await page.waitForTimeout(500);
check("analytics: Umami sends the page view", umamiSent.some((sent) => sent?.type === "event" && sent.payload?.website === FAKE_UMAMI && !sent.payload?.name), JSON.stringify(umamiSent).slice(0, 300));
/* The link's own file is 0.9 GB: send it nowhere, and keep the attributes. */
await frame.evaluate(() => {
  const link = document.querySelector('.dl-file[data-umami-event-platform="win-x64"]');
  link.href = `${location.href.split("#")[0]}#download`;
});
await frame.locator('.dl-file[data-umami-event-platform="win-x64"]').click();
for (let i = 0; i < 20 && !umamiSent.some((sent) => sent?.payload?.name === "Download"); i += 1) await page.waitForTimeout(500);
const click = umamiSent.find((sent) => sent?.payload?.name === "Download");
check("analytics: a click on Windows x64 sends Download with platform win-x64", click?.payload?.data?.platform === "win-x64" && click?.payload?.website === FAKE_UMAMI, JSON.stringify(click ?? umamiSent.slice(-1)).slice(0, 300));
note(`Umami was sent: ${umamiSent.map((sent) => sent?.payload?.name ?? "pageview").join(", ")}`);

/* --- The beta sign-up page ---------------------------------------------------------------- */

/* The page scrolls smoothly, and a click right after a smooth scroll can land where the
   label was a moment before; with motion reduced it scrolls at once. */
await page.emulateMedia({ reducedMotion: "reduce" });

/* Mail is caught here and kept in an option, so the notice to the admin can be read. */
await page.evaluate(async (source) => {
  await window.notaClient.writeFile("/wordpress/wp-content/mu-plugins/verify-mail.php", source);
}, `<?php
add_filter('pre_wp_mail', function ($null, $atts) {
	$mails = get_option('verify_mails', array());
	$mails[] = $atts;
	update_option('verify_mails', $mails, false);
	return true;
}, 10, 2);
`);
await runPhp("make the beta pages", `<?php require_once '/wordpress/wp-load.php';
wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'Beta','post_name'=>'beta','post_content'=>''));
wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'Testers','post_name'=>'testers','post_content'=>'<!-- wp:shortcode -->[nota_beta_signup]<!-- /wp:shortcode -->'));
echo 'ok';`);

const betaRows = async () => JSON.parse((await runPhp("read the sign-ups", `<?php require_once '/wordpress/wp-load.php';
$rows = array();
foreach (get_posts(array('post_type'=>'nota_beta_tester','post_status'=>array('publish','trash'),'posts_per_page'=>-1,'orderby'=>'ID','order'=>'ASC')) as $p) {
	$rows[] = array('id'=>$p->ID,'name'=>$p->post_title,'note'=>$p->post_content,'status'=>$p->post_status,'author'=>(int) $p->post_author,'email'=>get_post_meta($p->ID,'_nota_beta_email',true),'telegram'=>get_post_meta($p->ID,'_nota_beta_telegram',true),'devices'=>get_post_meta($p->ID,'_nota_beta_devices',true),'lang'=>get_post_meta($p->ID,'_nota_beta_lang',true),'sent'=>(int) get_post_meta($p->ID,'_nota_beta_sent',true));
}
echo wp_json_encode(array('rows'=>$rows,'mails'=>get_option('verify_mails', array())));`)).text);
const forgetLimits = () => runPhp("forget the hourly limit", `<?php require_once '/wordpress/wp-load.php'; global $wpdb;
foreach ($wpdb->get_col("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '_transient%nota_beta%'") as $name) { delete_option($name); }
echo 'ok';`);

const betaFacts = (frame) => frame.evaluate(() => ({
  lang: document.documentElement.lang,
  h1: document.querySelector("h1")?.textContent.trim(),
  title: document.title,
  intro: document.querySelector(".beta__intro")?.textContent.trim(),
  steps: document.querySelectorAll(".beta__steps li").length,
  fields: [...document.querySelectorAll(".beta-form [name]")].map((el) => el.name),
  devices: [...document.querySelectorAll(".beta-chip span")].map((el) => el.textContent.trim()),
  trapHidden: (() => {
    const trap = document.querySelector(".beta-form__trap");
    return !!trap && trap.getAttribute("aria-hidden") === "true" && trap.getBoundingClientRect().right <= 0 && trap.querySelector("input").tabIndex === -1;
  })(),
  done: document.querySelector("[data-beta-done] h2")?.textContent.trim(),
  again: document.querySelector(".beta-done__links a")?.getAttribute("href"),
  hash: location.hash,
  closed: document.querySelector(".beta-closed")?.textContent.trim(),
  formError: document.querySelector(".beta-form__errors > p")?.textContent.trim(),
  errors: [...document.querySelectorAll(".beta-form__errors li a")].map((a) => `${a.getAttribute("href")}|${a.textContent.trim()}`),
  errorFocused: !!document.activeElement?.hasAttribute("data-beta-errors"),
  chipsWidth: (() => {
    const hint = document.querySelector("#beta-devices-hint");
    const set = document.querySelector("#beta-devices");
    return hint && set ? Math.round((hint.getBoundingClientRect().width / set.getBoundingClientRect().width) * 100) : 0;
  })(),
  invalidBorder: (() => {
    const email = document.querySelector('#beta-email[aria-invalid="true"]');
    return email ? getComputedStyle(email).borderTopColor : "";
  })(),
  dangerColor: (() => {
    const error = document.querySelector(".field__error");
    return error ? getComputedStyle(error).color : "";
  })(),
  invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map((el) => el.id),
  described: document.querySelector("#beta-email")?.getAttribute("aria-describedby"),
  values: Object.fromEntries([...document.querySelectorAll('.beta-form input[type="text"], .beta-form input[type="email"], .beta-form textarea')].map((el) => [el.name, el.value])),
  checked: [...document.querySelectorAll(".beta-form input:checked")].map((el) => el.value),
  canonical: [...document.querySelectorAll('link[rel="canonical"]')].map((link) => link.href),
  alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => `${link.hreflang}=${link.href}`),
  descriptions: [...document.querySelectorAll('meta[name="description"]')].map((meta) => meta.content),
  ogTitle: document.querySelector('meta[property="og:title"]')?.content,
  ogImage: document.querySelector('meta[property="og:image"]')?.content,
  switchEn: document.querySelector('.lang-switch a[hreflang="en"]')?.href,
  switchAm: document.querySelector('.lang-switch a[hreflang="am"]')?.href,
  colors: [getComputedStyle(document.querySelector("h1") ?? document.body).color, getComputedStyle(document.body).color],
  assets: [...document.querySelectorAll('link[rel="stylesheet"], script[src]')].map((el) => el.href || el.src),
  url: location.href,
  text: document.body.innerText,
  html: document.documentElement.outerHTML,
}));

/* The form posts to its page's own address; the test keeps it a visitor's. */
const asVisitorForm = (frame) => frame.evaluate(() => {
  const form = document.querySelector(".beta-form");
  const url = new URL(form.action);
  url.searchParams.set("as_visitor", "1");
  form.action = url.href;
});
async function submitBeta(frame) {
  await Promise.all([frame.waitForNavigation({ waitUntil: "load", timeout: 120_000 }), frame.locator(".beta-form__submit").click()]);
  await page.waitForTimeout(300);
  return waitForWp();
}
/* A sign-up sent straight from the page's script, as a robot would. */
const postBeta = (frame, fields, headers = {}) => frame.evaluate(async ([entries, extra]) => {
  const url = new URL(document.querySelector(".beta-form")?.action ?? location.href);
  url.searchParams.set("as_visitor", "1");
  const data = new FormData();
  data.set("nota_beta", "1");
  for (const [key, value] of Object.entries(entries)) {
    for (const one of [].concat(value)) data.append(key, one);
  }
  const response = await fetch(url.href, { method: "POST", body: data, headers: extra });
  const text = await response.text();
  return { url: response.url, cache: response.headers.get("cache-control") ?? "", done: /[?&]thanks=1/.test(response.url), busy: /Too many sign-ups/.test(text), full: /a lot of sign-ups today/.test(text), closed: /taking sign-ups/.test(text), errors: (text.match(/class="field__error"/g) || []).length };
}, [fields, headers]);
const tester = (n, extra = {}) => ({ nota_beta_name: `Tester ${n}`, nota_beta_email: `tester${n}@example.com`, nota_beta_telegram: `tester_${n}`, "nota_beta_devices[]": ["linux"], nota_beta_consent: "1", ...extra });

for (const [lang, query] of [["en", "/beta/?as_visitor=1"], ["am", "/beta/?lang=am&as_visitor=1"]]) {
  consoleErrors = [];
  frame = await goto(query);
  const facts = await betaFacts(frame);
  check(`beta ${lang}: no PHP notices`, !notices(facts.html), notices(facts.html));
  check(`beta ${lang}: html lang`, facts.lang === lang, facts.lang);
  check(`beta ${lang}: heading, title and sharing title`, facts.h1 === (lang === "am" ? "የNota ሙከራ ቡድንን ይቀላቀሉ" : "Join the Nota beta") && facts.title.startsWith(facts.h1) && facts.ogTitle === `${facts.h1} · Nota` && /og-(en|am)\.png$/.test(facts.ogImage ?? ""), `${facts.h1} / ${facts.title} / ${facts.ogTitle} / ${facts.ogImage}`);
  check(`beta ${lang}: three steps`, facts.steps === 3, String(facts.steps));
  check(`beta ${lang}: the form's fields`, JSON.stringify(facts.fields) === JSON.stringify(["nota_beta", "nota_beta_name", "nota_beta_email", "nota_beta_telegram", "nota_beta_devices[]", "nota_beta_devices[]", "nota_beta_devices[]", "nota_beta_devices[]", "nota_beta_devices[]", "nota_beta_note", "nota_beta_consent", "nota_beta_website"]), facts.fields.join(", "));
  check(`beta ${lang}: the devices in the page's language`, facts.devices.join("|") === (lang === "am" ? "Mac|Windows|Linux|Android ስልክ|iPhone" : "Mac|Windows|Linux|Android phone|iPhone"), facts.devices.join("|"));
  check(`beta ${lang}: the robot trap is out of sight and out of reach`, facts.trapHidden);
  check(`beta ${lang}: the devices' hint spans the group, not a column of it`, facts.chipsWidth >= 90, `${facts.chipsWidth}%`);
  check(`beta ${lang}: one canonical, for this language`, facts.canonical.length === 1 && /\/beta\/(\?lang=am)?$/.test(facts.canonical[0]) && (lang === "am") === /lang=am/.test(facts.canonical[0]), facts.canonical.join(" "));
  check(`beta ${lang}: hreflang en, am and x-default on this page`, facts.alternates.length === 3 && facts.alternates.every((alt) => /\/beta\//.test(alt)), facts.alternates.join(" "));
  check(`beta ${lang}: one description, from the intro`, facts.descriptions.length === 1 && facts.descriptions[0] === facts.intro && facts.intro.length <= 170, `${facts.intro?.length} chars: ${facts.descriptions.join(" | ")}`);
  check(`beta ${lang}: the language switch stays on this page`, /\/beta\/$/.test(facts.switchEn ?? "") && /\/beta\/\?lang=am$/.test(facts.switchAm ?? ""), `${facts.switchEn} ${facts.switchAm}`);
  check(`beta ${lang}: no em or en dashes`, !/[–—]/.test(facts.text), (facts.text.match(/.{0,30}[–—].{0,30}/) || [""])[0]);
  if (withPlugins) {
    check(`beta ${lang}: the kit's magenta and Elementor's files stay off`, !facts.colors.includes("rgb(255, 0, 255)") && !facts.assets.some((url) => /elementor|swiper|font-awesome|eicons|fonts\.googleapis/.test(url)), `${facts.colors.join(", ")} ${facts.assets.filter((url) => /elementor/.test(url)).join(" ")}`);
  }
  for (const [width, label] of [[1440, "desktop"], [820, "tablet"], [390, "phone"], [360, "small"]]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    const overflow = await noOverflow(frame);
    check(`beta ${lang}: no sideways scroll at ${width}`, overflow.scroll <= overflow.limit && overflow.wide.length === 0, `${overflow.scroll}/${overflow.limit} ${overflow.wide.join(", ")}`);
    if (label === "desktop" || label === "phone") {
      for (const scheme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.waitForTimeout(200);
        await shoot(`beta-${lang}-${label}-${scheme}`, width);
        await page.setViewportSize({ width, height: 844 });
        await axe(frame, `beta ${lang} ${label} ${scheme}`);
      }
      await page.emulateMedia({ colorScheme: "light" });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const realErrors = consoleErrors.filter((text) => !/favicon|service worker|Failed to load resource.*(cors-proxy)/i.test(text));
  check(`beta ${lang}: no console errors`, realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
}

/* Mistakes come back on the page, with what was typed kept and the list focused. */
frame = await goto("/beta/?as_visitor=1");
await asVisitorForm(frame);
await frame.evaluate(() => {
  document.querySelector(".beta-form").noValidate = true;
  document.querySelector("#beta-name").value = "Abebe & Co <b>bold</b>";
  document.querySelector("#beta-email").value = "not an address";
  document.querySelector("#beta-telegram").value = "t.me/ab";
  document.querySelector("#beta-note").value = "ለማስታወሻ";
});
frame = await submitBeta(frame);
let beta = await betaFacts(frame);
check("beta: mistakes are listed, each linked to its field", JSON.stringify(beta.errors.map((error) => error.split("|")[0])) === JSON.stringify(["#beta-email", "#beta-telegram", "#beta-devices", "#beta-consent"]), beta.errors.join(" ; "));
check("beta: the answer's address names the list, and the list takes the focus", beta.hash === "#beta-errors" && beta.errorFocused, `${beta.hash} ${beta.errorFocused}`);
check("beta: a wrong field is outlined in red", !!beta.invalidBorder && beta.invalidBorder === beta.dangerColor, `${beta.invalidBorder} / ${beta.dangerColor}`);
check("beta: the wrong fields say so", JSON.stringify(beta.invalid) === JSON.stringify(["beta-email", "beta-telegram", "beta-consent"]) && beta.described === "beta-email-error", `${beta.invalid.join(", ")} / ${beta.described}`);
check("beta: what was typed is kept, without the markup", beta.values.nota_beta_name === "Abebe & Co bold" && beta.values.nota_beta_email === "not an address" && beta.values.nota_beta_telegram === "t.me/ab" && beta.values.nota_beta_note === "ለማስታወሻ", JSON.stringify(beta.values));
check("beta: no PHP notices after a mistake", !notices(beta.html), notices(beta.html));
await axe(frame, "beta with mistakes");
await shootPart("beta-mistakes-phone", "#signup", 390);
await page.setViewportSize({ width: 1440, height: 900 });
check("beta: nothing kept from a form with mistakes", (await betaRows()).rows.length === 0);

/* A sign-up, typed and clicked as a person would. */
frame = await goto("/beta/?as_visitor=1");
await asVisitorForm(frame);
await frame.locator("#beta-name").fill("Abebe Kebede");
await frame.locator("#beta-email").fill("Abebe@Example.com");
await frame.locator("#beta-telegram").fill("https://t.me/abebe_k");
await frame.locator('label[for="beta-device-mac"]').click();
await frame.locator('label[for="beta-device-android"]').click();
await frame.locator("#beta-note").fill("Lecture notes & meetings, ለማስታወሻ");
await frame.locator('label[for="beta-consent"]').click();
const sentBefore = umamiSent.length;
frame = await submitBeta(frame);
beta = await betaFacts(frame);
check("beta: a sign-up lands on the thank-you's #signed-up", beta.done === "You're on the list." && /\/beta\/\?thanks=1.*#signed-up$/.test(beta.url), `${beta.done} ${beta.url}`);
check("beta: the thank-you links back to the form for the next person", /\/beta\/#signup$/.test(beta.again ?? ""), String(beta.again));
await frame.waitForFunction(() => !!window.umami, null, { timeout: 30_000 }).catch(() => note("Umami's script did not load"));
for (let i = 0; i < 20 && !umamiSent.slice(sentBefore).some((sent) => sent?.payload?.name === "Beta sign-up"); i += 1) await page.waitForTimeout(500);
const signupEvent = umamiSent.slice(sentBefore).find((sent) => sent?.payload?.name === "Beta sign-up");
check("beta: Umami counts the sign-up, with its language", signupEvent?.payload?.data?.lang === "en" && signupEvent?.payload?.website === FAKE_UMAMI, JSON.stringify(signupEvent ?? umamiSent.slice(-1)).slice(0, 300));
await frame.evaluate(() => location.reload()).catch(() => {});
await page.waitForTimeout(3000);
frame = await waitForWp();
await page.waitForTimeout(3000);
check("beta: a reloaded thank-you doesn't count again", umamiSent.filter((sent) => sent?.payload?.name === "Beta sign-up").length === 1, umamiSent.map((sent) => sent?.payload?.name ?? "pageview").join(", "));
await shoot("beta-thanks-desktop", 1440, false);
let stored = await betaRows();
let first = stored.rows[0] ?? {};
check("beta: the sign-up is kept, cleaned up", stored.rows.length === 1 && first.name === "Abebe Kebede" && first.email === "abebe@example.com" && first.telegram === "abebe_k" && first.devices === "mac,android" && first.lang === "en" && first.status === "publish" && first.author === 0 && /Lecture notes &(amp;)? meetings, ለማስታወሻ/.test(first.note), JSON.stringify(first));
const mail = stored.mails[0] ?? {};
check("beta: the admin is emailed, with Reply-To the tester", stored.mails.length === 1 && mail.subject === "New Nota beta tester: Abebe Kebede" && /Telegram: @abebe_k \(https:\/\/t\.me\/abebe_k\)/.test(mail.message) && /Devices: Mac, Android phone/.test(mail.message) && /Note: Lecture notes & meetings/.test(mail.message) && JSON.stringify(mail.headers) === JSON.stringify(["Reply-To: abebe@example.com"]), JSON.stringify(mail).slice(0, 400));

/* The same address again changes nothing, and is thanked all the same. */
frame = await goto("/beta/?as_visitor=1");
let sent = await postBeta(frame, { nota_beta_name: "Someone else", nota_beta_email: "ABEBE@example.com", nota_beta_telegram: "@someone_else", "nota_beta_devices[]": ["iphone"], nota_beta_consent: "1" });
stored = await betaRows();
check("beta: an address already on the list keeps its first sign-up", sent.done && stored.rows.length === 1 && stored.rows[0].telegram === "abebe_k" && stored.mails.length === 1, JSON.stringify({ sent, rows: stored.rows.length, telegram: stored.rows[0]?.telegram }));

/* In Amharic, the thank-you stays Amharic. */
frame = await goto("/beta/?lang=am&as_visitor=1");
await asVisitorForm(frame);
await frame.locator("#beta-name").fill("ሰላም ታደሰ");
await frame.locator("#beta-email").fill("selam@example.com");
await frame.locator("#beta-telegram").fill("@selam_t");
await frame.locator('label[for="beta-device-windows"]').click();
await frame.locator('label[for="beta-consent"]').click();
frame = await submitBeta(frame);
beta = await betaFacts(frame);
stored = await betaRows();
check("beta am: the Amharic thank-you, and the language kept", beta.done === "ተመዝግበዋል።" && /\?lang=am&thanks=1/.test(beta.url) && beta.lang === "am" && stored.rows[1]?.lang === "am" && stored.rows[1]?.name === "ሰላም ታደሰ", `${beta.done} ${beta.url} ${JSON.stringify(stored.rows[1])}`);
const signups = () => umamiSent.filter((sent) => sent?.payload?.name === "Beta sign-up");
for (let i = 0; i < 20 && signups().length < 2; i += 1) await page.waitForTimeout(500);
check("beta am: a second sign-up in the same visit counts too, in Amharic", signups().length === 2 && signups()[1]?.payload?.data?.lang === "am", signups().map((sent) => sent.payload?.data?.lang).join(", "));
await shoot("beta-am-thanks-phone", 390, false);
await page.setViewportSize({ width: 1440, height: 900 });

/* Thanked but not counted: an address already on the list, a robot that fills the
   hidden field, and a thank-you link someone shared. */
for (const [label, website] of [["an address already on the list", ""], ["a robot caught by the hidden field", "https://spam.example"]]) {
  frame = await goto("/beta/?as_visitor=1");
  await asVisitorForm(frame);
  await frame.locator("#beta-name").fill("Again");
  await frame.locator("#beta-email").fill(website ? "robot@example.com" : "selam@example.com");
  await frame.locator("#beta-telegram").fill("@again_t");
  await frame.locator('label[for="beta-device-linux"]').click();
  await frame.locator('label[for="beta-consent"]').click();
  await frame.evaluate((value) => { document.querySelector("#beta-website").value = value; }, website);
  frame = await submitBeta(frame);
  beta = await betaFacts(frame);
  await page.waitForTimeout(2500);
  check(`beta: ${label} is thanked, not kept and not counted`, beta.done === "You're on the list." && beta.hash === "#signup" && (await betaRows()).rows.length === 2 && signups().length === 2, `${beta.hash} ${(await betaRows()).rows.length} rows, ${signups().length} counted`);
}
frame = await goto("/beta/?thanks=1&as_visitor=1");
await page.waitForTimeout(2500);
check("beta: a shared thank-you link is thanked and not counted", (await betaFacts(frame)).done === "You're on the list." && signups().length === 2, `${signups().length} counted`);

/* The rules for the Telegram field and the email field, and the address ranges. */
frame = await goto("/beta/?as_visitor=1");
sent = await postBeta(frame, tester(0, { nota_beta_telegram: "Abebe Kebede" }));
check("beta: a name typed as the Telegram username is refused, not squashed", !sent.done && sent.errors === 1, JSON.stringify(sent));
const ranges = JSON.parse((await runPhp("address ranges and keys", `<?php require_once '/wordpress/wp-load.php';
$key = function ($remote, $cf = null) { $_SERVER['REMOTE_ADDR'] = $remote; if ($cf === null) { unset($_SERVER['HTTP_CF_CONNECTING_IP']); } else { $_SERVER['HTTP_CF_CONNECTING_IP'] = $cf; } return array(nota_beta_client_ip(), nota_beta_client_key()); };
$cf = $key('162.158.1.1', '1.2.3.4'); $forged = $key('8.8.8.8', '1.2.3.4'); $plain = $key('1.2.3.4');
$v6a = $key('2001:db8:1:2:3:4:5:6'); $v6b = $key('2001:db8:1:2:ffff::1'); $v6c = $key('2001:db8:1:3::1'); $mapped = $key('::ffff:1.2.3.4');
echo wp_json_encode(array(
	'in' => array(nota_beta_in_range('104.16.1.1','104.16.0.0/13'), nota_beta_in_range('104.23.255.255','104.16.0.0/13'), nota_beta_in_range('2a06:98c7::1','2a06:98c0::/29'), nota_beta_in_range('2606:4700:10::1','2606:4700::/32')),
	'out' => array(nota_beta_in_range('104.24.0.1','104.16.0.0/13'), nota_beta_in_range('2a06:98c8::1','2a06:98c0::/29'), nota_beta_in_range('1.2.3.4','2606:4700::/32')),
	'cf' => $cf[0], 'forged' => $forged[0], 'sameKey' => $cf[1] === $plain[1],
	'v6' => array($v6a[1] === $v6b[1], $v6a[1] !== $v6c[1], $mapped[1] === $plain[1]),
));`)).text);
check("beta: Cloudflare's header is believed only from Cloudflare", ranges.in.every(Boolean) && !ranges.out.some(Boolean) && ranges.cf === "1.2.3.4" && ranges.forged === "8.8.8.8" && ranges.sameKey, JSON.stringify(ranges));
check("beta: an IPv6 /64 counts as one address, an IPv4-mapped one as its IPv4", ranges.v6.every(Boolean), JSON.stringify(ranges.v6));

/* Robots: the hidden field, and the hourly limit. */
frame = await goto("/beta/?as_visitor=1");
sent = await postBeta(frame, tester(0, { nota_beta_website: "https://spam.example" }));
check("beta: a filled-in trap is thanked and not kept", sent.done && (await betaRows()).rows.length === 2, JSON.stringify(sent));
sent = await postBeta(frame, tester(0, { nota_beta_consent: "" }));
check("beta: an answer with mistakes is never cached", !sent.done && sent.errors === 1 && /no-store|no-cache/.test(sent.cache), JSON.stringify(sent));
await forgetLimits();
const burst = [];
const names = { 1: { nota_beta_name: "=1+1" }, 2: { nota_beta_name: 'x\\",=1+1,"' } };
for (let n = 1; n <= 7; n += 1) burst.push(await postBeta(frame, tester(n, names[n] ?? {}), { "CF-Connecting-IP": `203.0.113.${n}` }));
check("beta: six sign-ups an hour from one address, then a message, whatever Cloudflare header it forges", burst.slice(0, 6).every((one) => one.done) && burst[6].busy && !burst[6].done, burst.map((one) => (one.done ? "done" : one.busy ? "busy" : "other")).join(", "));
const pastLimit = [];
for (let n = 0; n < 3; n += 1) pastLimit.push(await postBeta(frame, tester(1)));
check("beta: past the limit, an address on the list hears the same as any other", pastLimit.every((one) => one.busy && !one.done), JSON.stringify(pastLimit.map((one) => (one.done ? "done" : one.busy ? "busy" : "other"))));
await forgetLimits();
const repeats = [];
for (let n = 0; n < 8; n += 1) repeats.push(await postBeta(frame, tester(1)));
const counters = (await runPhp("count the limits' counters", `<?php require_once '/wordpress/wp-load.php'; global $wpdb;
echo (int) $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name LIKE '_transient_nota_beta_%'");`)).text.trim();
check("beta: an address already on the list is thanked, and uses up no limit", repeats.every((one) => one.done && !one.busy) && counters === "0", `${repeats.filter((one) => one.done).length} thanked, ${counters} counters`);
await forgetLimits();
stored = await betaRows();
check("beta: those six are kept", stored.rows.length === 8, String(stored.rows.length));
check("beta: a backslash in a name is kept as typed", stored.rows.some((row) => row.name === 'x\\",=1+1,"'), stored.rows.map((row) => row.name).join(" | "));
await runPhp("fill the day", `<?php require_once '/wordpress/wp-load.php'; set_transient('nota_beta_day_' . gmdate('Ymd'), 1000, DAY_IN_SECONDS); echo 'ok';`);
sent = await postBeta(frame, tester(30));
check("beta: past a thousand a day, the message says tomorrow, not an hour", sent.full && !sent.busy && !sent.done && (await betaRows()).rows.length === 8, JSON.stringify(sent));
await forgetLimits();

/* The shortcode in another page. */
frame = await goto("/testers/?as_visitor=1");
check("beta: [nota_beta_signup] shows the form in a page", await frame.evaluate(() => !!document.querySelector(".beta-embed .beta-form")));
await asVisitorForm(frame);
await frame.locator("#beta-name").fill("Shortcode Tester");
await frame.locator("#beta-email").fill("shortcode@example.com");
await frame.locator("#beta-telegram").fill("shortcode_t");
await frame.locator('label[for="beta-device-iphone"]').click();
await frame.locator('label[for="beta-consent"]').click();
frame = await submitBeta(frame);
beta = await betaFacts(frame);
check("beta: and it thanks there too", beta.done === "You're on the list." && /\/testers\/\?thanks=1/.test(beta.url) && (await betaRows()).rows.length === 9, `${beta.done} ${beta.url}`);

/* Closed, the page says so and keeps nothing. */
await customize({ nota_beta_open: false });
frame = await goto("/beta/?as_visitor=1");
beta = await betaFacts(frame);
sent = await postBeta(frame, tester(20));
check("beta: closed, the page says so and keeps nothing", !!beta.closed && beta.fields.length === 0 && sent.closed && !sent.done && (await betaRows()).rows.length === 9, `${beta.closed} / ${JSON.stringify(sent)}`);
await customize({ nota_beta_open: true, nota_beta_notify: false });
frame = await goto("/beta/?as_visitor=1");
sent = await postBeta(frame, tester(21));
stored = await betaRows();
check("beta: open again, and with the emails off none is sent", sent.done && stored.rows.length === 10 && stored.mails.length === 9, `${stored.rows.length} rows, ${stored.mails.length} mails`);
await forgetLimits();

/* Nobody else can see them. */
const firstId = stored.rows[0].id;
for (const path of [`/?p=${firstId}`, `/?post_type=nota_beta_tester`, "/?s=Kebede"]) {
  frame = await goto(`${path}&as_visitor=1`);
  const text = await frame.evaluate(() => document.body.innerText);
  check(`beta: a visitor finds no sign-up at ${path}`, !/Abebe Kebede|abebe@example\.com/.test(text), text.slice(0, 80).replace(/\s+/g, " "));
}
const caps = JSON.parse((await runPhp("who may see the sign-ups", `<?php require_once '/wordpress/wp-load.php';
$editor = wp_insert_user(array('user_login'=>'verify-editor','user_pass'=>wp_generate_password(24),'role'=>'editor','user_email'=>'editor@example.com'));
$type = get_post_type_object('nota_beta_tester');
echo wp_json_encode(array('editorList'=>user_can($editor, $type->cap->edit_posts), 'adminList'=>user_can(1, $type->cap->edit_posts), 'adminEdit'=>user_can(1, 'edit_post', ${firstId}), 'adminTrash'=>user_can(1, 'delete_post', ${firstId}), 'adminAdd'=>user_can(1, $type->cap->create_posts), 'rest'=>$type->show_in_rest, 'public'=>is_post_type_viewable($type)));`)).text);
check("beta: only administrators see the list, and nobody edits or adds", !caps.editorList && caps.adminList && !caps.adminEdit && caps.adminTrash && !caps.adminAdd && !caps.rest && !caps.public, JSON.stringify(caps));

/* The list in wp-admin. */
frame = await goto("/wp-admin/edit.php?post_type=nota_beta_tester");
const listed = () => frame.evaluate(() => ({
  menu: !!document.querySelector('#adminmenu a[href="edit.php?post_type=nota_beta_tester"]'),
  heads: [...document.querySelectorAll("thead th")].map((th) => (th.querySelector("a > span:first-child") ?? th).textContent.trim()).filter(Boolean),
  rows: document.querySelectorAll("#the-list tr:not(.no-items)").length,
  add: !!document.querySelector(".page-title-action"),
  linkedName: !!document.querySelector("#the-list .row-title[href]"),
  boxes: document.querySelectorAll('#the-list input[name="post[]"]').length,
  abebe: (() => {
    const row = [...document.querySelectorAll("#the-list tr")].find((tr) => tr.textContent.includes("Abebe Kebede"));
    return row && { telegram: row.querySelector(".column-nota_telegram a")?.href, devices: row.querySelector(".column-nota_devices")?.textContent.trim(), lang: row.querySelector(".column-nota_lang")?.textContent.trim(), sent: row.querySelector(".column-nota_sent")?.textContent.trim(), mark: row.querySelector(".nota_sent a")?.href, note: row.querySelector(".column-nota_email .description")?.textContent.trim() };
  })(),
  bulk: [...document.querySelectorAll("#bulk-action-selector-top option")].map((option) => option.value),
  waiting: document.querySelector(".subsubsub .nota_waiting")?.textContent.trim(),
  csv: document.querySelector('a[href*="action=nota_beta_csv"]')?.href,
  html: document.documentElement.outerHTML,
}));
let admin = await listed();
check("admin: Beta testers is in the menu, with every sign-up", admin.menu && admin.rows === 10, `${admin.menu} ${admin.rows}`);
check("admin: its columns", JSON.stringify(admin.heads.slice(-7)) === JSON.stringify(["Name", "Email", "Telegram", "Devices", "Language", "Link sent", "Signed up"]), admin.heads.join(", "));
check("admin: no Add New, no edit link, but boxes for bulk actions", !admin.add && !admin.linkedName && admin.boxes === 10, JSON.stringify({ add: admin.add, linked: admin.linkedName, boxes: admin.boxes }));
check("admin: a row's Telegram, devices, language and note", admin.abebe?.telegram === "https://t.me/abebe_k" && admin.abebe?.devices === "Mac, Android phone" && admin.abebe?.lang === "English" && /Lecture notes & meetings/.test(admin.abebe?.note ?? ""), JSON.stringify(admin.abebe));
check("admin: bulk actions mark the link or trash, and nothing edits", JSON.stringify(admin.bulk) === JSON.stringify(["-1", "nota_beta_sent", "nota_beta_unsent", "trash"]), admin.bulk.join(", "));
check("admin: Waiting for the link counts everyone at first", admin.waiting === "Waiting for the link (10)", String(admin.waiting));
check("admin: no PHP notices in the list", !notices(admin.html), notices(admin.html));
await shoot("admin-beta-testers", 1440, false);
await frame.goto(admin.abebe.mark, { waitUntil: "load" });
frame = await waitForWp();
admin = await listed();
check("admin: Mark link as sent records the day, and the count drops", !!admin.abebe?.sent && admin.abebe.sent !== "—Not yet" && admin.waiting === "Waiting for the link (9)" && (await betaRows()).rows[0].sent > 0, `${admin.abebe?.sent} / ${admin.waiting}`);
frame = await goto("/wp-admin/edit.php?post_type=nota_beta_tester&nota_waiting=1");
check("admin: and the waiting list leaves them out", (await listed()).rows === 9);
frame = await goto("/wp-admin/edit.php?post_type=nota_beta_tester&s=abebe_k");
check("admin: search finds a Telegram username", (await listed()).rows === 1);
frame = await goto("/wp-admin/edit.php?post_type=nota_beta_tester&s=selam%40example.com");
check("admin: and an email address", (await listed()).rows === 1);

const csv = await frame.evaluate(async (href) => {
  const response = await fetch(href);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { type: response.headers.get("content-type"), disposition: response.headers.get("content-disposition"), bom: [...bytes.slice(0, 3)].join(","), text: new TextDecoder().decode(bytes) };
}, admin.csv);
const csvLines = csv.text.trim().split("\n");
check("admin: Download CSV gives everyone, oldest first, readable in Excel", /text\/csv/.test(csv.type ?? "") && /attachment; filename="nota-beta-testers-/.test(csv.disposition ?? "") && csv.bom === "239,187,191" && csvLines.length === 11 && csvLines[0] === '"Signed up",Name,Email,Telegram,"Telegram link",Devices,Language,Note,"Link sent"' && /"Abebe Kebede",abebe@example\.com,abebe_k,https:\/\/t\.me\/abebe_k,"Mac, Android phone",English,"Lecture notes & meetings, ለማስታወሻ",\d{4}-/.test(csvLines[1]) && /ሰላም ታደሰ/.test(csvLines[2]), csvLines.slice(0, 3).join(" ;; "));
check("admin: a cell that a spreadsheet would run is defused", csv.text.includes(",'=1+1,"), (csvLines.find((line) => line.includes("=1+1")) ?? "").slice(0, 80));
check("admin: a backslash before a quote can't end a cell early", csv.text.includes(',"x\\"",=1+1,""",'), (csvLines.find((line) => line.includes("x\\")) ?? "").slice(0, 80));
const csvNoNonce = await frame.evaluate(async (href) => (await fetch(href.replace(/_wpnonce=[^&]+/, "_wpnonce=0"))).status, admin.csv);
check("admin: the CSV needs its nonce", csvNoNonce === 403, String(csvNoNonce));

/* The customizer has the switches beside the words. */
frame = await goto("/wp-admin/customize.php?autofocus[section]=nota_copy_beta");
await frame.waitForFunction(() => window.wp?.customize?.section && window.wp.customize.section("nota_copy_beta"));
await page.waitForTimeout(3000);
const betaControls = await frame.evaluate(() => window.wp.customize.section("nota_copy_beta").controls().map((control) => control.id));
check("customizer: Beta sign-up page has its switches and words", betaControls[0] === "nota_beta_open" && betaControls[1] === "nota_beta_notify" && betaControls.includes("nota_beta_title_am") && betaControls.includes("nota_beta_closed_en"), betaControls.slice(0, 6).join(", "));
await page.screenshot({ path: join(out, "customizer-beta.png") });

/* Out of the trash and back on the list; the marks without a trash. */
const restored = JSON.parse((await runPhp("trash and restore a tester", `<?php require_once '/wordpress/wp-load.php';
wp_set_current_user(1);
$id = ${stored.rows[1].id};
wp_trash_post($id);
$trashed = get_post_status($id);
wp_untrash_post($id);
$plain = nota_beta_bulk_actions(array('edit' => 'Edit', 'delete' => 'Delete permanently'));
$_REQUEST['post_status'] = 'trash';
$trash = nota_beta_bulk_actions(array('untrash' => 'Restore', 'delete' => 'Delete permanently'));
echo wp_json_encode(array('trashed' => $trashed, 'status' => get_post_status($id), 'plain' => array_keys($plain), 'trash' => array_keys($trash)));`)).text);
check("admin: a sign-up restored from the trash is back on the list", restored.trashed === "trash" && restored.status === "publish", JSON.stringify(restored));
check("admin: the marks are there even where the trash is off, and not in the trash", JSON.stringify(restored.plain) === JSON.stringify(["nota_beta_sent", "nota_beta_unsent", "delete"]) && JSON.stringify(restored.trash) === JSON.stringify(["untrash", "delete"]), JSON.stringify(restored));

/* Personal data: Tools, Export and Erase Personal Data find a sign-up by email. */
const privacy = JSON.parse((await runPhp("export and erase a tester", `<?php require_once '/wordpress/wp-load.php';
$exporters = apply_filters('wp_privacy_personal_data_exporters', array());
$erasers = apply_filters('wp_privacy_personal_data_erasers', array());
$export = call_user_func($exporters['nota-beta']['callback'], 'Abebe@Example.com', 1);
$erase = call_user_func($erasers['nota-beta']['callback'], 'abebe@example.com', 1);
$after = call_user_func($exporters['nota-beta']['callback'], 'abebe@example.com', 1);
echo wp_json_encode(array('export'=>$export, 'erase'=>$erase, 'after'=>count($after['data'])));`)).text);
const exported = Object.fromEntries((privacy.export?.data?.[0]?.data ?? []).map((item) => [item.name, item.value]));
check("privacy: the exporter finds a tester by email", exported.Name === "Abebe Kebede" && exported.Telegram === "@abebe_k" && exported.Note === "Lecture notes & meetings, ለማስታወሻ", JSON.stringify(exported));
check("privacy: the eraser deletes them", privacy.erase?.items_removed === true && privacy.after === 0 && (await betaRows()).rows.length === 9, JSON.stringify(privacy.erase));

await page.emulateMedia({ reducedMotion: null });
await customize({ nota_umami_id: "", nota_cf_token: "" });
frame = await goto("/?as_visitor=1");
const off = await frame.evaluate(() => ({ scripts: document.querySelectorAll("script[data-website-id], script[data-cf-beacon]").length, tracked: document.querySelectorAll("[data-umami-event]").length }));
check("analytics: emptied fields count nothing and leave no attributes", off.scripts === 0 && off.tracked === 0, JSON.stringify(off));
await context.unrouteAll({ behavior: "ignoreErrors" });

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
