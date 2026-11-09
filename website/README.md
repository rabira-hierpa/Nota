# Nota's website

A WordPress theme that markets the app. The upload is one file,
`website/dist/nota-app-theme.zip` (build it with
`bash website/scripts/build-theme-zip.sh`; it stays out of git).

## Install it

1. In wp-admin go to **Appearance, Themes, Add Theme, Upload Theme**, choose
   `nota-app-theme.zip`, then **Install Now** and **Activate**.
2. Open your site. The landing page is now the home page. You don't need to change
   **Settings, Reading**: WordPress prefers this theme's `front-page.php`, and the
   theme also overrules the template Elementor picks for a page it built.
3. If you still see the old page, purge the caches: **LiteSpeed Cache, Toolbox,
   Purge All**, then the CDN in Hostinger's hPanel.
4. Check `/?lang=am`, the Amharic page. The EN and አማ links in the header move
   between the two.

Plugins aren't required. Elementor and LiteSpeed Cache can stay active. The old
"Coming Soon" page isn't touched, but visitors can't reach it while the landing page
is on: it is still the page set in **Settings, Reading**, so its address leads to the
home page. You can still edit it in Elementor.

To go back: **Appearance, Customize, Nota landing page, Home page**, choose *The
page from Settings, Reading*. Or reactivate the old theme.

## Before you promote it

- **Google is blocked on the temporary address.** The `robots.txt` at
  `orchid-wren-246075.hostingersite.com` has `User-agent: Googlebot` and
  `Disallow: /`, so nothing here can be indexed until you connect a real domain, or
  remove that rule. Also check **Settings, Reading, Search engine visibility**, and
  that Hostinger's Coming Soon or maintenance switch is off.
- **Two meta descriptions?** Hostinger's plugin may print its own. After installing,
  view the page source and search for `name="description"`. There should be one.
- **Read the Amharic.** It's a draft that follows the app's own words, and no native
  speaker has reviewed it. Every line can be changed in the Customizer.
- **The release has a known gap.** The v0.3.0 files carry an incomplete model
  `NOTICE`. When the corrected release is out, change the version field (below).

## Change the words and links

**Appearance, Customize, Nota landing page.** Each section of the page has a group of
fields, with English and Amharic side by side. In the preview, click አማ to see the
Amharic page. Empty a field to hide that text.

| To change | Go to |
|---|---|
| Any text | The section's group (Top of the page, Speech, Download...) |
| All six download links, for a new release | **Links and version, Latest version** (one field, as long as the file names keep their pattern) |
| One download link | **Links and version**, that file's field |
| Android or iPhone button | **Links and version**: both are empty and hidden until you add a link, since nothing is published for phones |
| The phone guide | **Links and version**. It points at the `dev` branch today, because `mobile/README.md` isn't on `main` yet |
| A screenshot | **Screenshots**, which replaces it in both languages |
| Search title and description | **Search and sharing** |
| Logo and site icon | **Site Identity** |
| Extra menu links, such as a blog | **Menus**, the two *optional* locations |

Why the Customizer, and not blocks: each sentence gets its English and Amharic field
together with a live preview, nobody can break the layout by moving something, and it
keeps out of Elementor's way. Blocks would have meant two pages to keep in step, or a
translation plugin.

## What's here

```
wordpress-theme/nota-app/    the theme
  inc/content.php            every word on the page, both languages
  inc/customizer.php         the fields, built from that table
  inc/seo.php                title, description, hreflang, Open Graph, JSON-LD
  inc/elementor.php          keeps Elementor's files off the landing page
  template-parts/landing/    the page's sections
scripts/
  capture-desktop.mjs        the app's screens and clips, with sample notes
  capture-phone.py           the Android app's screens (emulator with -gpu host)
  fake-hohe.mjs              a stand-in for the speech model during capture
  build-assets.mjs           captures to assets/img
  build-social.mjs           sharing pictures and the Themes screen picture
  build-theme-zip.sh         the zip
  preview-theme.mjs          a throwaway WordPress with the zip installed, to look at
  verify-theme.mjs           installs the zip on WordPress and checks it
```

The numbers and claims on the page come from the repository's `README.md`,
`mobile/README.md` and the release notes. Change them there first.

The screens use sample notes. In the dictation clip the words come from a stand-in
for the model, typed at the pace of real dictation: the app and its cursor behaviour
are real, the recognition in that clip isn't.

Look at the theme before installing it, then open http://localhost:9411. Each reload
starts a fresh site with the newest zip, and nothing you do there is kept:

```bash
node website/scripts/preview-theme.mjs
```

Check a change with:

```bash
node website/scripts/verify-theme.mjs /tmp/nota-verify
```

It needs Google Chrome and a network connection, and it installs nothing: WordPress
runs inside the browser (WordPress Playground). Avoid `@wp-playground/cli` on a small
disk, because it unpacks more than 5 GB.
