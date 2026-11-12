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
| Visit counting, and download numbers on the page | **Visits and downloads** (below) |
| The release notes page's heading and intro | **Release notes page** (below) |
| The beta sign-up page's words, closing it, the email at each sign-up | **Beta sign-up page** (below) |
| Extra menu links, such as a blog | **Menus**, the two *optional* locations |

Why the Customizer, and not blocks: each sentence gets its English and Amharic field
together with a live preview, nobody can break the layout by moving something, and it
keeps out of Elementor's way. Blocks would have meant two pages to keep in step, or a
translation plugin.

## Visits and downloads

### Counting visits and download clicks: Umami

The theme counts with [Umami](https://umami.is). It sets no cookies and keeps
nothing that identifies a visitor, so the site needs no cookie banner, which fits an
app that promises nothing leaves your device. Its free cloud plan (Hobby: up to
100,000 events a month, one website, six months of history, per umami.is/pricing in
November 2026) also counts custom events, and that is what says which download
button people press. It doesn't care where nota.et's DNS is.

The others were weighed and set aside:

- **Cloudflare Web Analytics** is free and cookieless too, but it has no custom
  events (its FAQ: "Not yet"), so it can't count the buttons. Moving the DNS to
  Cloudflare wouldn't change that. The theme still takes its token, for visits only,
  if you want it as well.
- **Hostinger's statistics** come from the server, and a click on a download button
  goes to GitHub, never to the server, so they can't count clicks either.
- **Google Analytics 4** counts everything, but it sets cookies, so the site would
  need a consent banner, and it sends each visit to Google.

To switch it on:

1. Make a free account at umami.is, choose **Add website**, name it Nota, domain
   `nota.et`.
2. Copy its **Website ID** (Settings, Websites, Edit; it also appears in the
   tracking code as `data-website-id`).
3. In WordPress: **Appearance, Customize, Nota landing page, Visits and downloads**.
   Paste it into **Umami website ID**, then **Publish**.
4. Purge the caches (LiteSpeed Cache, Toolbox, Purge All, and the CDN in hPanel), so
   cached pages get the script.
5. Check it: open nota.et in a private window, where you aren't logged in. Umami's
   **Realtime** shows the visit. Nothing is counted while you are logged in to
   WordPress, nor in the Customizer's preview, so your own visits stay out.

A click on a download button is an event named **Download**, with a property
`platform`: `mac-arm64`, `mac-x64`, `win-x64`, `win-arm64`, `linux-x64` or
`linux-arm64` (and `android` or `ios` once those buttons have links). In Umami:
**Events**, then **Download**, then the **platform** property. Umami waits until the
click is sent before it starts the download. Each page view, each event and each
event property counts toward the plan's 100,000, so a download click counts twice.

The script carries `data-domains`, so a copy of the page served from another address
(the temporary hostingersite.com one) isn't counted, and `data-do-not-track`, so
browsers that ask not to be tracked aren't.

### Download counts

GitHub counts every download of every release file. The theme reads those numbers
with the release notes, in one request to GitHub's API, and keeps them:

- **Dashboard, Nota downloads** shows the total, each build (latest release and all
  releases) and each release. GitHub counts each file, the `.zip` and `.tar.gz` too,
  including your own downloads and automated ones; a build's row adds up its
  installer and its archive.
- The theme asks GitHub again every six hours, through WP-Cron, never during a
  visitor's page view (only a site that has never fetched waits, once). After you
  publish a release, press **Ask GitHub now** in that box.
- If GitHub can't be reached, the last numbers stay and the box says why. The API
  allows 60 requests an hour per server address, which on shared hosting other sites
  share. The theme sends GitHub's ETag, and an unchanged answer doesn't count against
  that. If the box ever says the limit was reached, a token raises it to 5,000: put
  `define( 'NOTA_GITHUB_TOKEN', 'github_pat_...' );` in `wp-config.php`, with a
  fine-grained token that has no permissions beyond public repositories. That is
  optional.

To show the numbers to visitors, tick **Show download numbers on the site** under
Visits and downloads. The total appears under the version in the download section
("{count} downloads so far", editable under Download), and each version's count on
the release notes page. It is off by default: small numbers don't help.

### Release notes

1. **Pages, Add New Page**, title `Releases`, and publish. The theme turns a page at
   `/releases/` or `/release-notes/` into the release notes by itself. For another
   address, pick the template **Nota release notes** in the page's settings.
2. Add it to a menu if you like: **Appearance, Menus**, one of the two *optional*
   locations.

The page shows the newest ten releases from GitHub, newest first: name, date, a
Latest badge, the notes, a link to the release on GitHub, and a download button by
the latest. The notes are GitHub's own rendering of the release's Markdown, cleaned
again by the theme: no scripts, styles, frames, forms or pictures, and links only to
`http`, `https` and `mailto`. The download section's "What's new in 0.3.0" link goes
to that version's notes.

The Amharic page is `/releases/?lang=am`, with the heading and intro from the
Customizer (**Release notes page**) and dates in the Ethiopian calendar. Release notes
are written in English, so it says so above them, unless a release's notes on GitHub
have a section headed `## አማርኛ`: then that section shows on the Amharic page, and
the English page leaves it out. Write it at the end of the notes, and GitHub readers
see both.

Anything written in the page itself shows under the intro. The shortcode
`[nota_releases count="3"]` puts the list in any page, Elementor's too. LiteSpeed Cache
keeps these pages at most a day, and the theme clears them when the notes change.

## Beta sign-up

1. **Pages, Add New Page**, title `Beta`, and publish. The theme turns a page at
   `/beta/`, `/beta-signup/` or `/join-the-beta/` into the sign-up page by itself. For
   another address, pick the template **Nota beta sign-up** in the page's settings.
2. Share `https://nota.et/beta/`, or `https://nota.et/beta/?lang=am` for the Amharic
   page. Both have their own title, description and sharing picture for X and Telegram.

The form asks for a name, an email address, a Telegram username (typed as `abebe`,
`@abebe` or a `t.me/abebe` link), the devices they'll test on, an optional note, and
a tick to say you may contact them. A mistake comes back on the same page with what
was typed kept, and the list of mistakes takes the focus; a sign-up goes to
`?thanks=1`, which links back to the form for the next person.

Everyone who signs up is under **Beta testers** in the admin menu, newest first, for
administrators only. Search finds names, emails and usernames. Each row links to the
email and to the Telegram chat; **Mark link as sent** (one row, or ticked rows with
Bulk actions) records when you sent the build, and **Waiting for the link** lists who
hasn't had it. **Download CSV** gives the whole list for a spreadsheet; it opens in
Excel with Ge'ez names intact. Nobody can add or edit a sign-up by hand, only move it
to the trash, and one restored from the trash goes back on the list. **Tools, Export
Personal Data** and **Erase Personal Data** find sign-ups by email, in the trash too,
and **Settings, Privacy** has a paragraph to add to your policy.

**Appearance, Customize, Nota landing page, Beta sign-up page** has the page's words in
both languages and two switches: **Take sign-ups** (untick to close the form) and
**Email me at each sign-up**, which goes to the address under **Settings, General**,
with Reply-To set to the tester, so replying writes to them. After fifty of those in a
day (UTC) the rest of the day's sign-ups are only in the list, and the fiftieth email
says so. Hostinger sends WordPress's mail; if none arrives, check the spam folder, or
set up an SMTP plugin.

The form suits page caching: it has no nonce for a cached copy to outlive, a sign-up is
posted to its own page, which no cache keeps, and the thank-you is the same for
everyone. One email address signs up once: a second sign-up with it is thanked and
changes nothing, so nobody can rewrite someone else's. A field that people can't see
catches robots, which are thanked and not kept. One address (or IPv6 /64 network) can
sign up six times an hour and the whole site a thousand times a day; an address
already on the list counts against neither. Behind Cloudflare the visitor's address
comes from Cloudflare's header, believed only from Cloudflare's own addresses. No IP
address is stored. With Umami on, each new sign-up counts once as the event **Beta
sign-up**, with the page's language; a robot caught by the hidden field, an address
already on the list, a reload and a shared thank-you link count nothing. The
shortcode `[nota_beta_signup]` puts the form in any page.

## What's here

```
wordpress-theme/nota-app/    the theme
  inc/content.php            every word on the page, both languages
  inc/customizer.php         the fields, built from that table
  inc/seo.php                title, description, hreflang, Open Graph, JSON-LD
  inc/elementor.php          keeps Elementor's files off the landing page
  inc/github.php             releases and download counts from GitHub, cached
  inc/releases.php           the release notes page and [nota_releases]
  inc/beta.php               the beta sign-up page, Beta testers in wp-admin, [nota_beta_signup]
  inc/analytics.php          Umami (and Cloudflare) scripts, download click events
  inc/dashboard.php          the Dashboard's Nota downloads box
  page-templates/            the release notes and beta sign-up templates
  template-parts/landing/    the page's sections
  template-parts/beta/       the sign-up form and its thank-you
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
