# Store reach in Ethiopia, sideloading, and how Nota ships its phone app

Scope: whether store-native model delivery (Play Asset Delivery / AI packs, Apple-hosted Background Assets) can reach Nota's users in Ethiopia, or whether a self-hosted download is needed anyway. Sources fetched 6 November 2026.

## Q1. Is there an App Store storefront for Ethiopia? Can Ethiopians install free apps from Google Play? What share of Ethiopian Android users install APKs from outside Play? Does Nota plan to ship through the stores, through APKs, or both?

### Takeaway
There is **no App Store storefront for Ethiopia**: Apple's availability page, published 30 October 2026, lists 39 African countries and Ethiopia is not one of them. **Google Play is fully open to Ethiopian users.** Google's distribution table, published 28 September 2026, marks Ethiopia for both "download free apps" and "make Google Play purchases", priced in ETB. Ethiopian developers can register on Play but cannot register as merchants. **No source measures how many Ethiopian Android users install apps from outside Play.** The only evidence is from a vendor survey and from anecdotes, and both suggest that sharing APKs between phones is common in Africa. Nota has **no store presence and no documented store plan.** Its mobile README builds release APKs that are still signed with the debug key and installs iOS builds from Xcode. Its GitHub Releases carry only desktop builds. From 2027, Google's developer verification will apply to APKs installed outside Play on certified devices, so a GitHub APK channel will also need a release key and a verified developer account.

### Cited Findings

**Apple App Store: Ethiopia**
- Apple's "Availability of Apple Media Services" page lists App Store availability by country. Its Africa section has 39 countries (Algeria, Angola, Benin, Botswana, Burkina Faso, Cameroon, Cape Verde, Chad, both Congos, Côte d'Ivoire, Eswatini, Gabon, Ghana, The Gambia, Guinea-Bissau, Kenya, Liberia, Madagascar, Malawi, Mali, Mauritania, Mauritius, Morocco, Mozambique, Namibia, Niger, Nigeria, Rwanda, São Tomé and Príncipe, Senegal, Seychelles, Sierra Leone, South Africa, Tanzania, Tunisia, Uganda, Zambia, Zimbabwe). Egypt and Libya appear under Middle East. **Ethiopia is not listed anywhere on the page.** The page says "Published Date: October 30, 2026". — [Apple Support: Availability of Apple Media Services (118205)](https://support.apple.com/en-us/118205)
- Apple community threads say the same, and describe what happens to users. One user reports Ethiopia is missing when changing an Apple ID's country or region. Another reply says "Apple does not have an App Store & iTunes Store for Ethiopia". A moderator says you have to live in a country to use its store. A developer notes that Ethiopia is not on App Store Connect's availability list and that in-app purchase is unavailable. **These are community posts, not Apple documentation, and their dates were not confirmed. The thread IDs suggest 2019–2024. The quotes come from search-result excerpts.** — [Apple Community: How do I get an Apple ID in Ethiopia?](https://discussions.apple.com/thread/255552020); [Apple Community: I'm from Ethiopia and the country is out of Apple regions](https://discussions.apple.com/thread/250539278); [Apple Community: Why there is no Apple Store in Ethiopia?](https://discussions.apple.com/thread/7646933); [Apple Developer Forums: How do apps show in regions where App Store is not available?](https://developer.apple.com/forums/thread/690873)
- Mobile OS share in Ethiopia, October 2026: **Android 93.82%, iOS 6.01%**. StatCounter measures web page views, so this is a usage proxy, not an installed base. — [StatCounter: Mobile OS market share, Ethiopia](https://gs.statcounter.com/os-market-share/mobile/ethiopia)

**Google Play: Ethiopian users**
- Google's "Supported locations for distribution to Google Play users" says it is "Version: 2026/01" and "The selected version of this page was published on September 28, 2026." The Ethiopia row reads **"Ethiopia (ET)", ✔ Download free apps, ✔ Make Google Play purchases, "ETB 7.92 - 158,478.42"**. The legend defines the columns this way:
  - ✔ under "Download free apps" means "Users in these locations may download free apps on Google Play."
  - ✔ under "Make Google Play purchases" means "Users in these locations may download paid apps, make in-app purchases or buy subscriptions on Google Play."
  - For contrast, Sudan's row reads ✔ free, ✘ purchases.
  — [Google Play: Supported locations for distribution to Google Play users](https://play.google.com/supported-locations?hl=en), linked from [Play Console Help table 3541286](https://support.google.com/googleplay/android-developer/table/3541286?hl=en). The table loads by script; I read it in a browser.
- A 2025 magazine article describes Ethiopians meeting "This item isn't available in your country" on Play for some apps. It says "“Cracked” versions of applications are now widely available on the internet". It names no apps and gives no figures. **Secondary source.** — [LolineMag, "Quietly Left Out: The 'Unsupported Region' Problem", 2 Aug 2025](https://www.lolinemag.com/article/quietly-left-out-the-unsupported-region-problem)

**Google Play: Ethiopian developers**
- Google's "Supported locations for developer and merchant registration" table has this Ethiopia row: **Supports Google Play Developer Registration ✔, Supports Merchant Registration ✘, Developer Default Currency ☆**. The legend says "☆ Location does not support merchants" and "If your location supports merchant registration, Google Play customers must be in a supported location to purchase apps." The page shows no date. — [Play Console Help: Supported locations for developer and merchant registration (table 3539140)](https://support.google.com/googleplay/android-developer/table/3539140?hl=en)
- Shega (21 Nov 2024, Daniel Metaferiya) writes: "While Google Play has extended developer registration to Ethiopia", "the platform still does not permit merchant registration for local developers." Only the article's summary could be read. — [Shega: Ethiopian Developers Demand More From Google Play Console](https://shega.co/news/ethiopian-developers-demand-more-from-google-console-access)

**Share of installs from outside Play (sideloading)**
- **I found no measured figure for Ethiopia.** The searches turned up no survey or telemetry, academic or from a regulator, on how Ethiopian Android users install apps: Play, Telegram, websites, phone shops or peer-to-peer sharing.
- **Vendor survey, Africa (unverified, secondary).** Datafree/Moya distributes its own app as an APK. Its founder reported a survey he ran in Africa: 96% of people had SHAREit installed, and 90% regularly shared installed apps. A 2021 update put the share who regularly get apps through SHAREit at 79%. The post's headline claims "In emerging markets only 30% of active app users come from Google Play". **Both Medium posts returned HTTP 403, so these figures come from search-result excerpts. The countries, sample and method are unknown, Ethiopia is not confirmed as included, and the vendor has a stake in the result.** — [Datafree (Medium): In emerging markets only 30% of active app users come from Google Play](https://medium.com/datafree/in-emerging-markets-only-30-of-active-app-users-come-from-google-play-e65e745724a4); [Datafree (Medium): The app install challenge in Africa](https://medium.com/datafree/the-app-install-challenge-in-africa-9fd0cc8cd35a)
- SHAREit says its growth in Africa comes from file sharing that uses no mobile data. It describes "Peer-to-Peer Offline App Sharing" that adds shared apps to the user's Play Library. **This is a company claim (secondary).** — [africa.com: SHAREit gears up for expansion in Africa](https://africa.com/headlines/shareit-gears-up-for-expansion-in-africa); [ITWeb: Over 1m apps shared in SA daily via SHAREit](https://itweb.co.za/article/over-1m-apps-shared-in-sa-daily-via-shareit/WnpNgM218Xz7VrGd)
- **Global baseline (older than 2024).** Kotzias, Caballero and Bilge (IEEE S&P 2021) found that "The Play market is the main app distribution vector responsible for 87% of all installs". Alternative markets accounted for 5.7% of installs and web downloads for under 0.1%. The data comes from security-product telemetry collected before 2020. It is not specific to Africa, and an Ethiopian breakdown was not found. — [arXiv 2010.10088, "How Did That Get In My Phone? Unwanted App Distribution on Android Devices"](https://arxiv.org/abs/2010.10088)
- Telegram dominates in Ethiopia. Quartz's analysis of Play Store data found Ethiopia was one of the few countries where Telegram was more popular than any other app. **Older than 2024 (2017–2018).** It measures Play installs of Telegram, not APK sharing through Telegram. — [Quartz: In a continent dominated by WhatsApp, Ethiopia prefers Telegram](https://qz.com/africa/1214381/in-a-continent-dominated-by-whatsapp-ethiopia-says-yes-to-telegram/)
- I found no evidence about Ethiopian developers distributing APKs through Telegram channels instead of Play. The search results were SEO spam pages about "Ethiopian TV" APKs.

**Android developer verification (affects any APK channel)**
- Google's timeline:
  - August 2026: "Developer APIs, limited distribution accounts, and power user advanced flow launch."
  - 30 September 2026: "Protections begin for all users who install apps from participating stores in Brazil, Indonesia, Singapore, and Thailand on certified devices running Android 7+."
  - 2027 and beyond: "Verification capability will be expanded globally for all apps on certified Android devices in 2027."
  - It adds: "Google Play automatically registers 99% of apps. Use Play Console to manually register remaining apps or those distributed outside Google Play."
  - The page has no date. Its newest linked post is from June 2026.
  — [Android Developers: Android developer verification](https://developer.android.com/developer-verification)
- The verification FAQ (each answer dated):
  - Sideloading: "If you distribute your app through other stores, or if users sideload your app directly, these new verification requirements won't apply to your app yet … we still recommend that you plan to complete your verification before the global rollout begins in 2027." (updated 15 Jul 2026)
  - Scope: it "will apply to all certified Android devices running Android 7 or higher" (updated 23 Mar 2026).
  - ADB: "As a developer, you are free to install apps without verification with ADB" (updated 3 Sep 2025).
  - Unverified apps: these can be installed after a one-time "advanced flow". The user enables developer mode, restarts, waits through "a one-time, one-day wait", then confirms with biometrics or PIN. "Unregistered apps can only be installed or updated when the advanced flow is enabled or by using ADB" (updated 23–25 Mar 2026).
  - Accounts: a Full Distribution account in the Android Developer Console costs $25 (updated 25 Mar 2026). A free limited distribution account can "share apps with up to 20 specific devices" (updated 18 Jun 2026).
  - Signing keys: "If you lose your signing key you won't be able to register your packages" (updated 23 Mar 2026). "The Android Developer Console lets you add and verify multiple signing keys for a single package" (updated 23 Mar 2026).
  - Sanctioned countries: checks "won't run on certified Android devices physically located in comprehensively sanctioned countries" (updated 30 Sep 2026).
  — [Android Developers: Developer verification FAQ](https://developer.android.com/developer-verification/guides/faq)

**Nota's current distribution (from the repository, 6 Nov 2026)**
- `mobile/README.md` builds Android with `flutter build apk --release --split-per-abi` and says "The release APKs are still signed with the debug key." For iOS it says "`flutter build ios` # iOS: then sign and install from Xcode". It notes that a free Apple ID works, "but its builds stop opening after 7 days". On models it says "The models (841 MB) don't ship in the app", and "A build made with `--dart-define=NOTA_MODELS_URL=<base URL>` can also download them. Nothing is hosted yet." — `/Users/rz/rz-codes/amharic-stt/mobile/README.md`
- `mobile/android/app/build.gradle.kts` has `applicationId = "com.rzcodes.nota"` and `minSdk = 24`. The release build type has the comment "Signed with the debug keys until there is a release keystore" and sets `signingConfig = signingConfigs.getByName("debug")`. — `/Users/rz/rz-codes/amharic-stt/mobile/android/app/build.gradle.kts`
- The latest GitHub release, Nota 0.3.0 (2 Nov 2026), has 12 assets: macOS, Windows and Linux builds only. **There is no APK or IPA.** The root README's Download section points to Releases for desktop only. — [github.com/rabira-hierpa/Nota/releases](https://github.com/rabira-hierpa/Nota/releases), checked with `gh release view`
- The mobile commit (47f4c1e) says "The models aren't bundled: the user copies them in." No file in the repo mentions Google Play, the App Store, TestFlight or a store listing. **No distribution plan for the phone app is documented.**

### Inferences
- **iOS in Ethiopia.** With no Ethiopian storefront, an App Store listing reaches Ethiopian iPhone users only through foreign-storefront Apple IDs. Community posts say that is common, but Apple's moderators say it breaks the residency rule. iOS is about 6% of Ethiopian mobile web use, so the App Store matters mostly for the diaspora and a minority at home. Without a store listing, the only iOS routes are Xcode builds (7-day expiry with a free Apple ID) or developer-account ad hoc or TestFlight builds. Apple-hosted Background Assets would reach every App Store install, whatever the storefront. But they reach no one unless Nota is in the App Store, and today it is not.
- **Android in Ethiopia.** Play is open to Ethiopian users, and Nota is free, so the lack of merchant registration doesn't matter. A Play listing is feasible even if the developer is in Ethiopia. Play AI packs or asset packs would then reach every Play install.
- **Sideloading share is unknown.** No Ethiopian figure exists. The only regional figures come from an interested vendor and show heavy peer-to-peer app sharing (SHAREit, Xender). The global baseline (about 87% from Play) is pre-2020 telemetry from mostly richer markets. The share of Nota users who would install outside Play cannot be quantified. Ethiopia's Telegram culture, shutdowns and data costs make APK sharing plausible, but this is not measured.
- **The deciding fact is Nota's own channel, not the market.** Today Nota ships nothing to phones through any store. Its only working channel (GitHub Releases) is outside the stores. A GitHub or Telegram APK gets no Play-delivered packs, so a self-hosted download plus the existing file import is needed for those users regardless of what share they are. Store-native delivery only becomes relevant once Nota publishes to Play or the App Store, and then only for those installs. Even then, peer-shared copies (SHAREit, Xender, Telegram) of a Play install would carry the base APK, not the 840 MB pack. Whether Play's own peer-to-peer sharing carries asset packs was not verified.
- **Developer verification changes the APK route in 2027.** From the global rollout, a GitHub-hosted Nota APK installs normally on certified Android 7+ phones only if com.rzcodes.nota is registered to a verified developer with its signing key. Otherwise users need the advanced flow with its one-day wait. Today's debug-key signing is unsuitable either way. A release keystore and a $25 Android Developer Console or Play Console verification are needed whichever channel Nota picks. The console accepts several signing keys per package, so a Play build and a GitHub build can both be registered. Separately, Android normally refuses to update an app signed with a different key. This is general Android behaviour, not sourced here, so a user moving between a Play-signed install and a self-signed GitHub APK may have to uninstall first.
- **Ethiopia is not exempt.** The sanctioned-country exemption covers only "comprehensively sanctioned countries". As far as I know Ethiopia is not one (not verified here), so verification checks would presumably run on phones in Ethiopia from 2027.

### Gaps
- **No measured share of Ethiopian Android installs from outside Play.** No GSMA, Ethiopian Communications Authority, academic or telemetry source was found. The Datafree/Moya survey couldn't be opened (403); its countries and method are unknown.
- **Nota's intended channel is undocumented.** Whether the user means to publish to Play, the App Store, GitHub Releases, or a mix is a product decision for the user. The repo shows only that nothing mobile is published yet.
- **Not researched:**
  - whether an Ethiopia-resident developer can enrol in the Apple Developer Program and publish to other storefronts;
  - whether TestFlight works for testers whose Apple ID is set to an unsupported region;
  - where Nota's publisher is legally located.
- **Not verified here:**
  - Apple's alternative distribution: EU alternative marketplaces and web distribution under the DMA, and Japan's alternative marketplaces. None is believed to apply to Ethiopia.
  - Whether Ethiopia is on any list of comprehensively sanctioned countries for Google's verification exemption.
  - The exact 2027 date when verification checks begin in Ethiopia.
- **Not found:** whether Play's "share apps" (Nearby) peer-to-peer feature, or SHAREit's "P2P offline app sharing", transfers Play asset packs or AI packs, or only the base and split APKs.
- **Not found:** data on how many Ethiopian iPhone users hold foreign-storefront Apple IDs.

## Q2. What exactly do the primary sources say (quoted), and how current are they?

### Takeaway
The store-availability facts rest on current primary sources: Apple's page (30 Oct 2026), Google's distribution table (28 Sep 2026) and Google's verification FAQ (answers dated Sep 2025–Sep 2026). Google's registration table is undated. The sideloading-share question rests only on secondary, vendor or pre-2024 sources, and no Ethiopian primary data exists.

### Cited Findings

| Claim | Exact wording | Source | Date | Primary? |
|---|---|---|---|---|
| No Ethiopian App Store | Ethiopia absent from the App Store country list (39 African countries listed) | [Apple Support 118205](https://support.apple.com/en-us/118205) | "Published Date: October 30, 2026" | Yes |
| Ethiopians can download free apps on Play | "Ethiopia (ET)" ✔ under "Download free apps": "Users in these locations may download free apps on Google Play." | [play.google.com/supported-locations](https://play.google.com/supported-locations?hl=en) | "published on September 28, 2026" (Version 2026/01) | Yes |
| Ethiopians can pay on Play | ✔ under "Make Google Play purchases": "may download paid apps, make in-app purchases or buy subscriptions"; price range "ETB 7.92 - 158,478.42" | same | same | Yes |
| Ethiopian developers: free apps only | Ethiopia: developer registration ✔, merchant registration ✘, "☆ Location does not support merchants" | [Play Console Help table 3539140](https://support.google.com/googleplay/android-developer/table/3539140?hl=en) | Undated (fetched 6 Nov 2026) | Yes |
| Registration opened (news) | "Google Play has extended developer registration to Ethiopia", "still does not permit merchant registration for local developers" | [Shega](https://shega.co/news/ethiopian-developers-demand-more-from-google-console-access) | 21 Nov 2024 | No |
| Verification goes global | "Verification capability will be expanded globally for all apps on certified Android devices in 2027." | [developer.android.com/developer-verification](https://developer.android.com/developer-verification) | Undated; newest linked post June 2026 | Yes |
| Sideloaded apps exempt for now | "if users sideload your app directly, these new verification requirements won't apply to your app yet" | [Verification FAQ](https://developer.android.com/developer-verification/guides/faq) | "Last updated: July 15, 2026" | Yes |
| Unregistered apps need advanced flow | "Unregistered apps can only be installed or updated when the advanced flow is enabled or by using ADB" | same | "Last updated: March 25, 2026" | Yes |
| ADB exempt | "you are free to install apps without verification with ADB" | same | "Last updated: Sept 3, 2025" | Yes |
| Limited distribution account | "share apps with up to 20 specific devices for testing and personal use at no cost and without ID verification" | same | "Last updated: June 18, 2026" | Yes |
| ADC fee | "The $25 fee for the Full Distribution account in the ADC" | same | "Last update: March 25, 2026" | Yes |
| Android vs iOS share | Android 93.82%, iOS 6.01% | [StatCounter](https://gs.statcounter.com/os-market-share/mobile/ethiopia) | October 2026 | Third-party measurement |
| Play's share of installs (global) | "The Play market is the main app distribution vector responsible for 87% of all installs" | [arXiv 2010.10088](https://arxiv.org/abs/2010.10088) | Oct 2020 / IEEE S&P 2021. **Older than 2024** | Academic, not Ethiopia |
| African app sharing | 96% had SHAREit installed, 90% regularly shared apps, 79% (2021) get apps via SHAREit | [Datafree (Medium)](https://medium.com/datafree/in-emerging-markets-only-30-of-active-app-users-come-from-google-play-e65e745724a4) | ~2019–2021. **Older than 2024; not opened (403)** | Vendor, secondary |
| Telegram's dominance | Telegram more popular than any other app in Ethiopia (Play data) | [Quartz](https://qz.com/africa/1214381/in-a-continent-dominated-by-whatsapp-ethiopia-says-yes-to-telegram/) | 2017–2018. **Older than 2024** | Secondary |
| Region locks and piracy | "This item isn't available in your country"; "“Cracked” versions of applications are now widely available" | [LolineMag](https://www.lolinemag.com/article/quietly-left-out-the-unsupported-region-problem) | 2 Aug 2025 | Secondary |
| Nota ships debug-signed APKs, iOS via Xcode | "The release APKs are still signed with the debug key." / "then sign and install from Xcode" | `/Users/rz/rz-codes/amharic-stt/mobile/README.md` | Repo state 6 Nov 2026 | Primary (project) |
| No mobile build in releases | v0.3.0 assets: desktop only | [GitHub Releases](https://github.com/rabira-hierpa/Nota/releases) | 2 Nov 2026 | Primary (project) |

### Inferences
- Google's verification timeline has already slipped once: press in early 2026 described an August user launch, and the later dates are September 2026 and 2027. Recheck the 2027 global date before relying on it for a release plan.
- The Play distribution table is versioned ("2026/01"). The ETB pricing and the ✔ for purchases may be recent changes. Older secondary sources (2019–2020 Play expansion news) did not list Ethiopia among countries with paid apps. Either way, the free-apps ✔ is what matters for Nota.

### Gaps
- Google's registration table (3539140) shows no publication date, so I can't say when Ethiopia gained developer registration beyond Shega's November 2024 report.
- No primary source on Ethiopian sideloading exists that I could find. Every number about installs outside Play is secondary, vendor-sourced, or pre-2024 and global.
- The Apple community threads' dates and exact wording were seen only in search excerpts.
