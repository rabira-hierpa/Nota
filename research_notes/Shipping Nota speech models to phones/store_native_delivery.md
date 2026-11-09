# Store-native delivery of Nota's ~840 MB speech models (App Store and Google Play)

Scope: hohe-w8.onnx (723,419,839 bytes, about 723 MB) + punct-w8.onnx (117,182,179 bytes, about 117 MB) + small JSON, about 840 MB in total, into a Flutter app (Android minSdk 24, iOS 16+). Research date: 6 November 2026. Most Apple and Google pages show no "last updated" date; where none is shown, the date given is the fetch date (Nov 2026) and the page content (for example, mentions of iOS 27) shows it is current.

## 1. Store size limits, cellular download thresholds, and install conversion at ~900 MB

### Takeaway
Both stores accept an ~840 MB model payload. iOS allows up to 4 GB uncompressed inside the app itself. On Google Play the 723 MB Hohe file can't go in the base module (500 MB compressed limit), so it has to be an asset pack or AI pack (1.5 GB compressed each, 4 GB cumulative for install-time content). On both stores, any download over 200 MB on mobile data triggers a confirmation prompt by default. Google's install-conversion data on app size dates from 2017 and covers apps under 100 MB; no current primary data exists for a ~900 MB non-game app.

### Cited Findings
**App Store (Apple)**
- iOS/iPadOS apps with a deployment target of iOS 9.0 or later have a maximum uncompressed app size of **4 GB**. The maximum executable size is **500 MB**, counted as the total of all `__TEXT` sections in the binary. Apple checks each Mach-O executable against these limits. (Page undated, ©2026, fetched Nov 2026.) — [Apple: Maximum build file sizes](https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes)
- Same page: Background Assets can be used "to host larger assets managed separately from your build". For Apple-Hosted Background Assets, the product page shows an "Up to" size that includes non-localized essential asset packs plus the localized essential packs for the single language with the largest total. — [Apple: Maximum build file sizes](https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes)
- The product-page size varies by device. On iOS it shows the installation size for the specific device model. — [Apple: Maximum build file sizes](https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes)
- Cellular downloads: since iOS 13, Settings > App Store > App Downloads (Cellular Data) offers "Always Allow", "Ask If Over 200 MB" (the default) and "Always Ask". The prompt can be accepted; it is no longer a hard block. **Secondary sources only, dated 2019. This predates 2024 and should be checked against current iOS.** — [9to5Mac, 2019](https://9to5mac.com/2019/06/03/ios-13-removes-200-mb-file-size-limit-for-app-downloads-over-cellular/amp/); [iDownloadBlog, 2019](https://www.idownloadblog.com/2019/10/25/about-app-store-cellular-download-limit/); [MacRumors how-to](https://www.macrumors.com/how-to/download-large-apps-over-cellular-iphone-ipad/)

**Google Play**
- All limits apply to the **compressed download size**: base module **500 MB**; each feature module **500 MB**; each asset pack **1.5 GB**; all modules plus install-time asset packs together **4 GB**; all on-demand and fast-follow asset packs together **30 GB**; total app maximum **34 GB**. At most 100 asset packs per bundle. (Page undated, ©2026.) — [Play Console Help: Maximum size limits](https://support.google.com/googleplay/android-developer/answer/9859372)
- Apps larger than 1 GB must target API level 21 or higher (Nota's minSdk 24 meets this). Apps over 200 MB trigger a non-blocking dialog for users installing on mobile data. Legacy APK-only apps are limited to 100 MB. — [Play Console Help: Maximum size limits](https://support.google.com/googleplay/android-developer/answer/9859372)
- Fast-follow and on-demand packs: "If the download is larger than 200 MB and the user is not on Wi-Fi, the download does not start until the user explicitly gives their consent". If Wi-Fi drops, the pack is paused in state `WAITING_FOR_WIFI`. The app can call `showConfirmationDialog()`; otherwise the download resumes only on Wi-Fi. — [Android Developers: Integrate asset delivery (Kotlin & Java)](https://developer.android.com/guide/playcore/asset-delivery/integrate-java)

**Install conversion vs size**
- Google Play (2017): "For every 6 MB increase to an APK's size, we see a decrease in the install conversion rate of 1%". This applies to apps **below 100 MB**. In markets such as India and Brazil, removing 10 MB correlated with about a 2.5% increase in conversion. For games of 500–3,000 MB, conversion rose only about 1% per 200 MB removed. **The source is from 2017 and older than 2024. It shows correlation, not causation. The original Medium post returned HTTP 403, so these quotes come from search-result excerpts and secondary coverage.** — [Google Play Apps & Games (Medium), "Shrinking APKs, growing installs", 2017](https://medium.com/googleplaydev/shrinking-apks-growing-installs-5d3fcba23ce2); [Android Authority, 2018](https://androidauthority.com/boost-your-app-downloads-832027)
- One developer who cut 42 MB saw only a 0.38% relative change in conversion, far below the ~9.5% uplift the rule of thumb predicts. This is a single anecdote from a secondary source. — [Martin Mazanec (Medium)](https://medium.com/@martinmazanec/shrinked-app-size-by-42mb-was-it-worth-it-ac34f76b14c7)

### Inferences
- **iOS, bundled:** putting both ONNX files in the iOS app (~840 MB plus the app) is within the 4 GB uncompressed limit. The 500 MB limit applies only to the executable's `__TEXT`, not to resource files. The product page would show roughly 0.9 GB, and users on the default setting would get the "over 200 MB" cellular prompt.
- **Android, bundled:** because Hohe alone (723 MB, and int8 weights likely compress poorly) is above the 500 MB base-module limit, "just bundling as a Flutter asset" will very likely fail Play's limits. Flutter puts pubspec assets in the base module. That placement is my understanding of Flutter's Android build, not something a fetched source confirmed. The model must go in an install-time, fast-follow or on-demand asset pack or AI pack.
- The Hohe file (723 MB) and the punctuation file (117 MB) each fit within the 1.5 GB per-pack limit, so one pack holding both is possible if their compressed total stays under 1.5 GB.
- Size data for ~900 MB apps exists only for games. A notes app has a different user intent, and Ethiopian users are more data-cost sensitive, so the 2017 emerging-market figures point to size mattering more, not less. Deferring the model (fast-follow, on-demand, or a separate pack) keeps the listed store size small.

### Gaps
- No Apple primary source was retrieved for the current cellular threshold (200 MB) and its settings. Only 2019 third-party articles were found.
- No 2024–2026 primary data on install conversion vs size for non-game apps near 1 GB, and none specific to Ethiopia.
- The compressed size of hohe-w8.onnx and punct-w8.onnx was not measured. Play's limits and download sizes depend on it. Nota could check by zipping the files or reading Play Console's reported sizes.

## 2. Play Asset Delivery (PAD): delivery modes, limits, updates, Flutter support

### Takeaway
PAD is free and Google-hosted. It offers install-time (part of the install and counted in the store size), fast-follow (downloaded automatically right after install, not counted) and on-demand (downloaded when the app requests it, not counted) packs of up to 1.5 GB compressed each. Packs update only with a new app release (with delta patching), not independently. Flutter has no official PAD support: deferred components use feature modules, not asset packs. Two small, unverified community plugins exist, or Nota can write a thin platform channel to the Play `AssetPackManager`.

### Cited Findings
- PAD delivery modes (page last updated **2026-10-06**):
  - **install-time:** delivered at install as split APKs, usable at launch, counted in the Play Store app size; users can't modify or delete these packs.
  - **fast-follow:** downloaded automatically after install without the user opening the app; doesn't block entry to the app; not counted in the store size.
  - **on-demand:** downloaded while the app runs; not counted in the store size.
  - PAD is "free to use". Asset packs contain no executable code.
  — [Android Developers: Play Asset Delivery](https://developer.android.com/guide/playcore/asset-delivery)
- Disk space: install-time packs need "at least two times the size of all the asset packs" free; fast-follow and on-demand packs "require only a few hundred extra MBs". — [Android Developers: Play Asset Delivery](https://developer.android.com/guide/playcore/asset-delivery)
- Updates: install-time packs update together with the base app. Fast-follow and on-demand packs update in four steps: patch download, app binary update, invalidation of previously downloaded packs, then local patch application. Developers should show an "update in progress" UI or handle invalidated assets. The page presents asset updates as part of app updates and documents no independent pack updates. — [Android Developers: Play Asset Delivery](https://developer.android.com/guide/playcore/asset-delivery)
- Fast-follow and on-demand packs are stored "in a separate folder in the app's internal storage". `getPackLocation()`/`assetsPath()` give a filesystem path. Install-time packs are read through the Android `AssetManager` API. "The Play Store automatically triggers the download of any fast-follow packs after the user installs or updates the app", but these packs may not be ready at first launch. "Apps are required to disclose the size of the download before fetching the asset pack." Play Asset Delivery Library version: `com.google.android.play:asset-delivery:2.3.0`. — [Android Developers: Integrate asset delivery (Kotlin & Java)](https://developer.android.com/guide/playcore/asset-delivery/integrate-java)
- Asset packs are added as Gradle modules (`com.android.asset-pack` plugin, `assetPacks = [...]` in the app's build.gradle, AGP 4.0.0+). You must run the app as an app bundle, not a standalone APK, to access packs. — [Android Developers: Integrate asset delivery (Kotlin & Java)](https://developer.android.com/guide/playcore/asset-delivery/integrate-java)
- The PAD page lists Java/Kotlin, Native and Unity integrations and does not mention Flutter. — [Android Developers: Play Asset Delivery](https://developer.android.com/guide/playcore/asset-delivery)
- **Flutter deferred components** (docs updated **2026-09-29**, Flutter 3.47) work on Android and web, not iOS. On Android they are dynamic **feature modules** through Play Core (`PlayStoreDeferredComponentManager`); assets-only components are allowed. The page doesn't mention Play Asset Delivery or asset packs. The whole app must be uploaded as one AAB, and partial updates are unsupported. — [Flutter docs: Deferred components](https://docs.flutter.dev/perf/deferred-components)
- Community plugins (pub.dev, fetched Nov 2026):
  - **`store_asset_packs` 0.1.0**, published about 9 days before the fetch (late October 2026). Unverified uploader, MIT, 1 like, 160 points, 416 downloads. On Android it supports PAD install-time, fast-follow and on-demand, tested with minSdk 24, AGP 9.0.1 and Gradle 9.1.0. On iOS (iOS 15+) it uses Apple-hosted Background Assets on iOS 26+, falling back to ODR for packs Background Assets can't deliver or that don't start within 20 s, and uses ODR on iOS 15–25. Its docs note that the stores never deliver packs to a `flutter run` install. — [pub.dev: store_asset_packs](https://pub.dev/packages/store_asset_packs)
  - **`asset_delivery` 1.1.0**, published about 21 months before the fetch (around early 2025). Unverified uploader, 12 likes, 140 points, 524 downloads. It uses PAD on Android (minSdk 24) and On-Demand Resource tags on iOS, with no Background Assets support. Its documentation says bundletool testing works only on Android below 12, and its install example uses a Git dependency. — [pub.dev: asset_delivery](https://pub.dev/packages/asset_delivery)

### Inferences
- Feature modules, and therefore Flutter's deferred components, have a **500 MB per-module limit**. They can't hold the 723 MB Hohe file, so Nota would need asset packs (or AI packs) even if it used deferred components.
- Fast-follow or on-demand packs are the better fit for ONNX Runtime. They are ordinary files in internal storage with a real path, which suits flutter_onnxruntime's file-based session creation. Install-time packs sit inside split APKs behind `AssetManager`. Using one would likely mean copying 723 MB out to a file first, which doubles storage, or reading it into memory.
- Fast-follow starts automatically after install from the Play Store. Over mobile data it will wait for Wi-Fi or for consent above 200 MB. This matches Ethiopian data-cost concerns: Nota can show an in-app "download speech model (840 MB) now on mobile data?" step through `showConfirmationDialog()`.
- Because packs update only with app releases, and Play's patching re-downloads only changed files, shipping app updates while leaving the model unchanged should cost users little data. A model update means a new app release.
- Integration without a plugin is small: add an asset-pack Gradle module under `mobile/android/`, plus a MethodChannel wrapping `AssetPackManager` (fetch, states, location, confirmation dialog). The community plugins are very young (store_asset_packs) or stale and ODR-only on iOS (asset_delivery).

### Gaps
- The PAD overview doesn't explicitly say packs *cannot* be updated independently. The conclusion that updates are tied to app versions comes from the documented update flow and from the AI-packs page (section 3).
- No primary source confirms how long Play keeps a fast-follow pack pending before giving up, or how fast-follow behaves under the iOS-like "Ask" settings on Play.
- The behaviour of `store_asset_packs` was taken from its pub.dev README only. Its source code was not reviewed.

## 3. Play for On-device AI (AI packs)

### Takeaway
AI packs are Play Asset Delivery specialised for ML models. They have the same install-time, fast-follow and on-demand modes, the same 1.5 GB per pack and 4 GB cumulative limits, and add device targeting by RAM, SoC, device model or system features. They are free and Google-hosted, and they update with the app binary (unchanged packs aren't re-downloaded). As of November 2026 they are still labelled **beta**, with an **alpha** client library (0.1.1-alpha01) and no Flutter plugin.

### Cited Findings
- Play for On-device AI "brings the benefits of Android App Bundles and Google Play delivery to custom ML model distribution … at no additional cost". You upload one artifact and Play handles hosting, delivery, updates and targeting. Modes:
  - **install-time:** "can guarantee that a very large model is present when your app is opened", installed as an APK.
  - **fast-follow:** downloaded automatically in the background after install, to internal storage.
  - **on-demand:** requested at runtime, to internal storage.
  — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- Limits: "Individual AI packs can be up to 1.5GB, based on their compressed download sizes. The maximum cumulative app size of any version of your app generated from your app bundle is 4GB." "Apps over 1GB in size must set min SDK Level to 21 or higher." — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- Updates: "AI packs are updated together with the app binary. If your new app release doesn't make changes to an AI pack, then Play's automatic patching process will ensure the user doesn't have to re-download it." — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- AI packs contain only models. Java/Kotlin and native libraries aren't allowed and go in the base or a feature module. "Models downloaded by Play for On-device AI should only be used by your apps." Use is subject to the Play Developer Distribution Agreement and the Play Core SDK terms. — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- Tooling: AGP **8.8+** for AI packs (`com.android.ai-pack` plugin); device targeting needs AGP **8.10.0+** and `android.experimental.enableDeviceTargetingConfigApi=true`. Fast-follow and on-demand packs use the Play AI Delivery Library, `com.google.android.play:ai-delivery:0.1.1-alpha01`. Local testing uses bundletool 1.18.0+ with `--local-testing`; in local tests fast-follow behaves as on-demand, Wi-Fi waits aren't covered, and updates aren't supported. — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- Device targeting:
  - Groups are defined in XML by RAM (`min_bytes`/`max_bytes`), included/excluded device IDs (up to 10,000 per group), required/forbidden system features, and system-on-chip.
  - "It's not possible to prevent any variant of your AI pack being delivered to certain devices. Non-targeted devices will always receive the default variant." The default can be empty.
  - Feature modules, by contrast, can be withheld from non-targeted devices entirely.
  — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- Large downloads follow the same rule as PAD: over 200 MB without Wi-Fi needs explicit consent (`WAITING_FOR_WIFI`, `showConfirmationDialog()`). — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- The documented runtimes are LiteRT and MediaPipe; ONNX isn't mentioned either way. — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- Status: Google "launched Play for On-Device AI in beta" (Android Developers Blog, **16 June 2025**). The post names no eligibility or sign-up requirement. — [Android Developers Blog, 16 Jun 2025](https://android-developers.googleblog.com/2025/06/top-3-updates-for-ai-on-android-google-io.html). In November 2026 the docs page title is still "Play for On-device AI (beta)" in every locale. — [search results for the page title](https://developer.android.com/google/play/on-device-ai?hl=en)

### Inferences
- For Nota, an AI pack offers two things a plain PAD asset pack doesn't: (a) RAM-based targeting, so a ~600M-parameter model goes only to phones with enough memory and other phones get an empty default variant, and (b) the documented "AI" path. Otherwise it is functionally PAD: same limits, no independent model updates.
- Nothing restricts the file format to LiteRT. An AI pack is an assets directory, so .onnx files should work. This is an inference; no source confirms ONNX use.
- Risks: beta status and an alpha client library (0.1.1-alpha01), plus no Flutter plugin. Nota would need a native module and a MethodChannel, and AGP 8.8+/8.10+ in `mobile/android`. Plain PAD (library 2.3.0, stable) is the lower-risk choice for the same delivery outcome. Its own device targeting is also supported, per the PAD overview's "Device targeting … supported".

### Gaps
- No announcement found of general availability or of beta graduation in 2025–2026. No published eligibility rules beyond accepting the terms.
- No Google statement on ONNX models in AI packs, or on whether AI packs and regular asset packs share the same 100-pack cap.

## 4. iOS On-Demand Resources (ODR)

### Takeaway
ODR is Apple-hosted and tied to the app build: Xcode generates the packs when the app is built. It is **deprecated as of iOS 27 / iPadOS 27 (2026)**, and Apple recommends migrating to Background Assets. Its per-pack limit is **512 MB before iOS 18** (8 GB from iOS 18), so the 723 MB Hohe file can't be a single ODR asset on iOS 16–17 without being split.

### Cited Findings
- "On-Demand Resources are deprecated on Apple platforms as of iOS 27, iPadOS 27, tvOS 27, and visionOS 27, and support will be removed in future releases. Migrating to Background Assets is recommended." — [Apple: On-Demand Resources size limits](https://developer.apple.com/help/app-store-connect/reference/on-demand-resources-size-limits/)
- iOS/iPadOS ODR limits:

  | Item | Earlier than iOS 18 | iOS 18 or later |
  |---|---|---|
  | App bundle | 2 GB | 4 GB |
  | Asset pack | 512 MB | 8 GB |
  | Asset pack count | 1000 | 1000 |
  | Initial install and prefetched tags | 4 GB | no limit |
  | In-use ODR | 2 GB | no limit |
  | Hosted ODR | 20 GB | 70 GB |

  "Asset packs are generated by Xcode when your app is built. One tag may result in multiple asset packs." — [Apple: On-Demand Resources size limits](https://developer.apple.com/help/app-store-connect/reference/on-demand-resources-size-limits/)
- WWDC25: "On-Demand Resources is a legacy technology, and it will be deprecated. Its successor is Background Assets." Apple suggests starting migration. (June 2025.) — [WWDC25 session 325, Discover Apple-Hosted Background Assets](https://developer.apple.com/videos/play/wwdc2025/325/)
- In the Background Assets documentation, `NSBundleResourceRequest`, the ODR API, is flagged as deprecated. — [Apple: Background Assets documentation](https://developer.apple.com/documentation/backgroundassets)

### Inferences
- For Nota's iOS 16–25 users, ODR is the only Apple-hosted, no-server option. It is deprecated, though still functional on those older OS versions because deprecation began in iOS 27. On iOS 16–17 the 723 MB hohe-w8.onnx exceeds the 512 MB per-pack limit. Shipping it there would need the model split into chunks under 512 MB, for example with ONNX external-data files or byte-level chunks reassembled on device. iOS 18+ allows 8 GB packs.
- ODR packs are built with the app, so a model update means an app update, the same as bundling.

### Gaps
- No Apple primary source found on whether ODR initial-install tags count toward the App Store's displayed app size or the 200 MB cellular prompt.
- No date was found for when ODR "support will be removed".

## 5. Apple Background Assets and Apple-hosted asset packs (WWDC25, iOS 26)

### Takeaway
Apple-Hosted Background Assets (iOS 26+) let Nota upload the models to App Store Connect as versioned asset packs, separate from the app build. Apple hosts them, with 200 GB included in the developer membership, and delivers them with an **essential** policy (downloaded as part of the app install, ready at first launch), a **prefetch** policy (starts at install and may continue afterwards) or an **on-demand** policy. Packs can be updated without a new app build, but each pack version still goes through App Review, and an update switches every installed app version over. Devices on iOS 16–25 can't use Apple-hosted packs: those users need ODR, a self-hosted unmanaged Background Assets extension (iOS 16.4+ for essential downloads), or a bundled model. Flutter access requires native Swift: an extension target plus a platform channel, or the new `store_asset_packs` plugin.

### Cited Findings
- Framework availability: Background Assets dates from iOS/iPadOS 16.0 and macOS 13.0. "The default implementation of Managed Background Assets handles downloads, updates, compression, and more for you. If you choose Apple-Hosted Background Assets, you upload your assets to App Store Connect and maintain them there, similar to app builds." The framework is to be used "only to download additional assets for your app". — [Apple: Background Assets documentation](https://developer.apple.com/documentation/backgroundassets)
- `AssetPackManager`, the managed and Apple-hosted API, was introduced in **iOS 26.0** (also iPadOS, macOS, tvOS and visionOS 26.0). Apps must adopt `ManagedDownloaderExtension` (self-hosted) or StoreKit's `StoreDownloaderExtension` (Apple-hosted); not doing so is "a programmer error". Methods include `ensureLocalAvailability(of:requireLatestVersion:)`, `checkForUpdates()`, `url(for:)`, `contents(at:…)`, `remove(assetPackWithID:)` and `status(relativeTo:)`. — [Apple: AssetPackManager](https://developer.apple.com/documentation/backgroundassets/assetpackmanager)
- "Apps targeting iOS 26, iPadOS 26, macOS 26, tvOS 26, and visionOS 26 and later can use Managed Background Assets." Localized asset packs need iOS 27+. "Users' devices automatically download these asset packs separately from your app build. When you use Apple hosting, you can also upload asset packs to App Store Connect separately from your app build." — [App Store Connect Help: Overview of Apple-hosted asset packs](https://developer.apple.com/help/app-store-connect/manage-asset-packs/overview-of-apple-hosted-asset-packs)
- Download policies (WWDC25, June 2025):
  - **Essential:** "the system automatically downloads the asset pack and integrates the download into the installation process". It counts toward the progress shown in the App Store, TestFlight and on the Home screen, and "once the installation finishes and a person opens your app, the asset pack is ready to use". Essential can be limited to `firstInstallation` rather than `subsequentUpdate`.
  - **Prefetch:** "starts downloading … during the installation … but the download could continue in the background after the app's installation finishes".
  - **On-demand:** downloaded only when the app calls the API.
  — [WWDC25 session 325](https://developer.apple.com/videos/play/wwdc2025/325/)
- Hosting and cost: "You get 200GB of Apple hosting capacity included in your Apple Developer Program membership." — [WWDC25 session 325](https://developer.apple.com/videos/play/wwdc2025/325/)
- Limits: the asset pack total is **200 GB** per app record, and the asset pack count is **200** per app record, shared across platforms. The total is the sum, over packs, of each pack's largest eligible version. Archiving packs frees space but removes all versions, including live ones. An email warning arrives at 80% of the total. No per-pack maximum is stated. — [App Store Connect Help: Apple-hosted asset pack size limits](https://developer.apple.com/help/app-store-connect/reference/app-uploads/apple-hosted-asset-pack-size-limits). One search snippet and a forum thread cited an older limit of **100** packs, so the count appears to have changed. — [Apple Developer Forums thread 810659](https://origin-devforums.apple.com/forums/thread/810659)
- Update cycle: "Once uploaded, the asset pack is assigned a version, and it is not tied to any specific app build." Replacing the App Store version means "all versions of your app downloaded from the App Store will automatically be switched over to using asset pack version 2, including older versions that are still installed on people's devices", so a pack must stay compatible with older app builds. — [WWDC25 session 325](https://developer.apple.com/videos/play/wwdc2025/325/)
- App Review: pack versions are submitted for review. "You can submit one asset pack version by itself or alongside other asset packs, an app version … If you submit an asset pack version and an app version together, the App Review team will use your selected asset pack version to review your app." External TestFlight testing of a pack also needs approval. — [WWDC25 session 325](https://developer.apple.com/videos/play/wwdc2025/325/)
- Displayed size: the product page's "Up to" size includes essential asset packs (non-localized, plus the largest single language's localized packs). — [App Store Connect Help: Apple-hosted asset pack size limits](https://developer.apple.com/help/app-store-connect/reference/app-uploads/apple-hosted-asset-pack-size-limits); [Apple: Maximum build file sizes](https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes)
- Tooling:
  - `ba-package` (ships with Xcode; Linux and Windows builds announced) creates a manifest (pack ID, download policy, file selectors, platforms) and a compressed `.aar` archive.
  - Upload goes through Transporter, iTMSTransporter, or the App Store Connect API (`backgroundAssets`, `backgroundAssetVersions`, `backgroundAssetUploadFiles`).
  - Local testing uses `ba-serve`, which needs an SSL certificate from a root CA installed on test devices, plus a Developer Settings override.
  - Required Info.plist keys: `BAAppGroupID`, `BAHasManagedAssetPacks = true`, `BAUsesAppleHosting = true`.
  - The system-provided downloader extension needs "no custom code".
  — [WWDC25 session 325](https://developer.apple.com/videos/play/wwdc2025/325/)
- Older-OS path, self-hosted (unmanaged) Background Assets: the "Downloading essential assets in the background" sample fetches "the assets your app requires before its first launch using an app extension". It lists iOS **16.4**+ and Xcode 15. Info.plist keys:
  - `BAEssentialMaxInstallSize`: the combined maximum size of essential assets downloaded "before it launches your app".
  - `BAMaxInstallSize`: non-essential assets downloaded right after install.
  - `BAInitialDownloadRestrictions`.
  - `BAManifestURL`: the location of the asset manifest on the developer's server.
  — [Apple sample: Downloading essential assets in the background](https://developer.apple.com/documentation/backgroundassets/downloading-essential-assets-in-the-background); [Apple: Background Assets documentation](https://developer.apple.com/documentation/backgroundassets)
- Flutter: `store_asset_packs` 0.1.0 (late Oct 2026) wraps Apple-hosted Background Assets on iOS 26+, with an ODR fallback on iOS 15–25. — [pub.dev: store_asset_packs](https://pub.dev/packages/store_asset_packs)

### Inferences
- For iOS 26+ users, an **essential Apple-hosted pack** comes closest to "the model is just there". It downloads with the app, is ready at first launch, costs Nota nothing for bandwidth up to 200 GB stored, and can be updated without an app release (still App Review). A `firstInstallation`-only essential policy plus `checkForUpdates()` would let a model update arrive in the background.
- Because essential packs count in the "Up to" size, the App Store listing would show about 0.9 GB. The 200 MB cellular prompt very likely applies to the whole install. That is unconfirmed (see Gaps). A **prefetch** or **on-demand** pack keeps the listed size small and lets Nota ask before an 840 MB mobile-data download.
- Nota supports iOS 16+, and `AssetPackManager` is iOS 26.0+. Options:
  - **(a)** Raise iOS minimum to 26.
  - **(b)** Ship two paths: Apple-hosted packs on 26+, and ODR on 16–25. ODR is deprecated, and on 16–17 Hohe must be split below 512 MB.
  - **(c)** Bundle in the binary for everyone.
  - **(d)** Self-host for older devices (unmanaged Background Assets from 16.4, or plain URLSession). This puts hosting and bandwidth back on Nota.
- Integration from Flutter needs a native **app extension target** (Background Download / `StoreDownloaderExtension`), an **App Group**, the Info.plist keys, and a MethodChannel to `AssetPackManager` for `ensureLocalAvailability` and `url(for:)`. `url(for:)` returns a file URL that can be handed to flutter_onnxruntime. This fits Nota's existing "models are files on disk" approach.
- Privacy promise: a store-hosted download (Apple or Google) involves no Nota server and no user data. It keeps "notes stay on the phone" intact as well as or better than self-hosting.

### Gaps
- No per-pack maximum size for Apple-hosted packs is published. Only the 200 GB total and the 200-pack count were found. The 723 MB file is presumably fine, but no source says so.
- Unconfirmed whether an essential pack is subject to the "Ask If Over 200 MB" cellular prompt, or how prefetch and on-demand packs behave on cellular. No Apple primary source found.
- Unknown how long App Review takes for pack-only submissions.
- Numeric caps for `BAEssentialMaxInstallSize` and `BAMaxInstallSize` (self-hosted path) weren't retrieved.
- No data found on the iOS 26+ share of active devices in November 2026, globally or in Ethiopia. This decides how many users an iOS-26-only path covers.

## 6. Cross-cutting: bandwidth cost, displayed app size, App Review, update cycle (per option)

### Takeaway
Every store-native option has the store pay for bandwidth. They differ in whether the model inflates the listed size (bundled, install-time, Apple essential: yes; fast-follow, on-demand, prefetch: no) and in whether a model update needs an app release (all options except Apple-hosted Background Assets). Apple-hosted packs are still reviewed.

### Cited Findings
- **Bundled in the iOS binary:** counted in the app's install size (up to 4 GB uncompressed). Updated only with app builds. — [Apple: Maximum build file sizes](https://developer.apple.com/help/app-store-connect/reference/maximum-build-file-sizes)
- **Play install-time asset/AI pack:** counted in the Play Store app size, delivered as split APKs, updated with the app, within the 4 GB install-time cumulative limit. — [Android Developers: Play Asset Delivery](https://developer.android.com/guide/playcore/asset-delivery); [Play Console Help: Maximum size limits](https://support.google.com/googleplay/android-developer/answer/9859372)
- **Play fast-follow and on-demand:** not counted in the store size, up to 30 GB in total. Updated with app releases, with patching so unchanged packs aren't re-downloaded. Free to use, "at no additional cost". — [Android Developers: Play Asset Delivery](https://developer.android.com/guide/playcore/asset-delivery); [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)
- **iOS ODR:** Apple-hosted, up to 70 GB on iOS 18+ and 20 GB before; built with the app; deprecated in iOS 27. — [Apple: On-Demand Resources size limits](https://developer.apple.com/help/app-store-connect/reference/on-demand-resources-size-limits/)
- **Apple-hosted Background Assets:** 200 GB of hosting included in the membership. Essential packs count in the "Up to" size. Pack versions are independent of builds but submitted to App Review. — [WWDC25 session 325](https://developer.apple.com/videos/play/wwdc2025/325/); [App Store Connect Help: Apple-hosted asset pack size limits](https://developer.apple.com/help/app-store-connect/reference/app-uploads/apple-hosted-asset-pack-size-limits)

### Inferences
Summary for Nota (inference from the findings above):

| Option | Hohe 723 MB fits? | In listed size? | Model update without app release? | Who pays | Flutter effort |
|---|---|---|---|---|---|
| Android: Flutter asset in base | No (500 MB base limit) | Yes | No | Google | none, but blocked by limit |
| Android: PAD install-time | Yes (1.5 GB/pack) | Yes | No (patched) | Google | Gradle module + AssetManager copy-out |
| Android: PAD fast-follow / on-demand | Yes | No | No (patched) | Google | Gradle module + MethodChannel or `store_asset_packs` |
| Android: AI pack (beta) | Yes | install-time yes, others no | No (patched) | Google | as PAD + alpha library, AGP 8.8+ |
| iOS: bundled in .app | Yes (4 GB) | Yes | No | Apple | none (Flutter asset) |
| iOS: ODR (deprecated iOS 27) | iOS 18+ yes; 16–17 needs split (<512 MB) | unclear | No | Apple | `asset_delivery` / `store_asset_packs` or native |
| iOS: Apple-hosted BA (iOS 26+) | Yes (no per-pack cap published) | essential yes; prefetch/on-demand no | **Yes** (reviewed) | Apple (200 GB included) | extension target + App Group + channel, or `store_asset_packs` |

- On cellular-heavy Ethiopian networks, the options that defer the download (Play fast-follow or on-demand, Apple prefetch or on-demand) let the app explain the ~840 MB download and ask before using mobile data. Play then enforces Wi-Fi or consent above 200 MB.

### Gaps
- No primary statement from Google on whether Play reviews asset-pack contents differently from code. Packs ship inside the AAB, so they go through the normal app review (inference).
- No primary source confirms that App Store app updates are delta-patched for unchanged large resources. This matters for the "bundled in iOS binary" update cost.
