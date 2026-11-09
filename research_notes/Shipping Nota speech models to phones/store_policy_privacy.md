# App Store and Google Play policy and privacy disclosures for downloading, bundling or server-serving Nota's speech models

Context: Hohe 8-bit ONNX (hohe-w8.onnx, 723,419,839 bytes, CC BY 4.0) plus punctuation model (punct-w8.onnx, 117,182,179 bytes, Apache-2.0), about 840 MB in all, run on the device with ONNX Runtime through flutter_onnxruntime. Research done 6 November 2026. Policy pages were fetched live on that date unless a source date is given.

## 1. Apple App Review Guidelines: 2.5.2, 4.2.3, 4.2, 2.1, 2.3, and whether ML weights are "executable code"

### Takeaway
No App Review guideline names ML models. 2.5.2 bans downloading "code which introduces or changes features or functionality". Model weights that only feed inference the reviewer already saw are data, not code, and an Apple DTS engineer said in July 2025 that updating ML models after install "isn't in conflict with App Store guidelines". The rule that clearly applies is 4.2.3(ii): an 840 MB download that the app needs on first launch must show its size and ask the user first.

### Cited Findings
- **2.5.2 (current text):** "Apps should be self-contained in their bundles, and may not read or write data outside the designated container area, nor may they download, install, or execute code which introduces or changes features or functionality of the app, including other apps." The only exception is educational apps that teach programming. — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (fetched 6 Nov 2026)
- **4.2.3 (current text):** "(i) Your app should work on its own without requiring installation of another app to function." "(ii) If your app needs to download additional resources in order to function on initial launch, disclose the size of the download and prompt users before doing so." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **4.2 intro:** "Your app should include features, content, and UI that elevate it beyond a repackaged website… If your App doesn't provide some sort of lasting entertainment value or adequate utility, it may not be accepted." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **2.1(a):** "Submissions to App Review… should be final versions with all necessary metadata and fully functional URLs included; placeholder text, empty websites, and other temporary content should be scrubbed before submission… include demo account info (and turn on your back-end service!) if your app includes a login… Ensure the demo mode exhibits your app's full features and functionality. We will reject incomplete app bundles and binaries that crash or exhibit obvious technical problems." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **2.3 intro:** "Customers should know what they're getting when they download or buy your app, so make sure all your app metadata, including privacy information, your app description, screenshots, and previews accurately reflect the app's core experience and remember to keep them up-to-date with new versions." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **2.3.1(a):** "All new features, functionality, and product changes must be described with specificity in the Notes for Review section of App Store Connect (generic descriptions will be rejected) and accessible for review." No 2.3 sub-item mentions app size or download size. — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **2.4.5(iv), Mac App Store only:** Mac apps "may not download or install standalone apps, kexts, additional code, or resources to add functionality or significantly change the app from what we see during the review process." This matters only if the desktop app ever goes to the Mac App Store. — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **No guideline in the current text mentions machine learning or ML models.** The fetched text covers sections 1 through 5.2.5; the last ~14k characters (5.3 onward) were not read. — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Date of the current text:** Apple last revised the guidelines on 13 November 2025. That update added "third-party AI" to 5.1.2(i), and the live page's wording matches it. Secondary sources only, since Apple's news post was not retrieved. — [Cult of Mac](https://www.cultofmac.com/news/apple-app-review-guidelines-on-ai); [iGeeksBlog](https://www.igeeksblog.com/apple-app-store-ai-data-disclosure-guidelines); [TechRepublic](https://www.techrepublic.com/de/article/news-apple-app-review-guidelines-ai-data-sharing/)
- **Apple DTS on downloading models (Developer Forums, July 2025):** A developer asked whether an app may download .mlmodel or .onnx files from its own server after install, "No executable code, scripts, or dynamic libraries… only model data files." The accepted answer came from an "Apple Staff, DTS Engineer": "As far as DTS is aware updating your app's ML models after installation isn't in conflict with App Store guidelines. There are existing apps that depend on this behavior. We recommend cross-posting this question in the App Store Distribution & Marketing topic area and requesting confirmation from App Review." — [Apple Developer Forums thread 793131](https://developer.apple.com/forums/thread/793131)
- **An approved app that fetches models from Hugging Face:** PocketPal AI (open source) is listed on both the App Store and Google Play. Users search Hugging Face for GGUF models from inside the app and download them, and gated models take a personal HF token. — [a-ghorbani/pocketpal-ai on GitHub](https://github.com/a-ghorbani/pocketpal-ai). Store listings were not checked directly; the HF-search detail also appears on mirrors ([mwm.ai](https://mwm.ai/>/apps/pocketpal-ai/6502579498)).
- **Search result:** No reported App Store rejection under 2.5.2 for downloading model weights turned up. The commentary found treats 2.5.2 as aimed at downloaded logic that changes features. — secondary: [ptkd.com](https://ptkd.com/journal/guideline-2-5-2-downloading-scripts-without-review), [appsubmitter.io](https://www.appsubmitter.io/blog/webview-app-rejected-guideline-2-5-2/)
- **Apple-hosted asset packs (Background Assets):** App Store Connect allows a 200 GB total and 200 asset packs per app record, shared across platforms. Limits are counted per pack over all versions "eligible to be tested in TestFlight or submitted for App Store distribution". Older cached copies of the page said 100 packs. — [App Store Connect Help: Apple-hosted asset pack size limits](https://developer.apple.com/help/app-store-connect/reference/apple-hosted-asset-pack-size-limits); [Forums thread 810659](https://developer.apple.com/forums/thread/810659)

### Inferences
- **Weights are data under 2.5.2.** The ONNX files are numeric weights plus an operator graph. ONNX Runtime, compiled into the reviewed binary, executes the graph, and the graph cannot call iOS APIs. Downloading Hohe adds no feature the reviewer did not see, provided the speech feature, its UI and the download flow are all in the reviewed build. Shipping a *different* model later that adds, say, a new language or a new capability is a grey area under 2.5.2 and 2.3.1. Swapping in a better Hohe checkpoint for the same feature is the case DTS said is fine.
- **Today's sideload flow is a review risk.** If the app were submitted with users copying models in themselves (adb, Finder, Files), the reviewer could not get the models, and the speech feature would look broken or missing under 2.1(a) and 2.3. A built-in download from a host Nota controls, or Apple-hosted asset packs, removes that risk.
- **What 4.2.3(ii) asks for.** The download must not start silently. Show the size ("about 840 MB"), explain what it is, and ask before downloading. A Wi-Fi recommendation fits in that prompt.
- **4.2 is satisfied either way.** The notes features work with no model, so the app has utility without the download.
- **Apple-hosted asset packs give the cleanest compliance story.** The packs go through App Store Connect, there is no third-party host, and Apple's privacy page says developers are "not responsible for disclosing data collected by Apple" (see section 4). The iOS version they need was not checked here (see Gaps), and Nota supports iOS 16+.

### Gaps
- No statement *from App Review* (as opposed to DTS) on model downloads; DTS itself defers to App Review. The forum's App Store Distribution topic was not searched for a follow-up.
- The guideline page carries no "last updated" date. The 13 Nov 2025 date rests on press coverage, and any 2026 revision (for example at WWDC 2026) could not be confirmed or ruled out. The quoted text is the live text as of 6 Nov 2026 either way.
- Not verified here: the minimum OS for Apple-hosted Background Assets (believed to be iOS 26, from WWDC25), and whether asset packs are reviewed together with the binary.
- PocketPal AI's current App Store and Play listings were not opened directly.

## 2. Google Play Developer Program Policies: Device and Network Abuse, executable code, AI content, size and data disclosures

### Takeaway
Play bans downloading "executable code (such as dex, JAR, .so files)" from outside Google Play. ONNX weights are none of those. Interpreted code is covered only when it can reach Android APIs, and an ONNX graph cannot. Google's own Play for On-device AI ships models as "AI packs" that may contain "only models", which shows Google treats models as distinct from code. Using AI packs avoids the question altogether.

### Cited Findings
- **Device and Network Abuse:** "an app may not download executable code (such as dex, JAR, .so files) from a source other than Google Play." Apps may not update themselves other than through Google Play's update mechanism. — [Google Play policy: Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/9888379) (fetched 6 Nov 2026; page shows only "©2026 Google", no revision date)
- The same policy covers interpreted languages (JavaScript, Python, Lua) "loaded at run time" (not packaged with the app), which must not allow policy violations. It also says: "This restriction does not apply to code that runs in a virtual machine or an interpreter where either provides indirect access to Android APIs", for example JavaScript in a webview. — [Google Play policy: Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/9888379)
- Listed violations include "Apps or SDKs that download executable code, such as dex or native code, from outside Google Play". None of the listed violations concern data or model files. — [Google Play policy: Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/9888379)
- The same page also covers foreground service permissions and **user-initiated data transfer jobs**, the Android 14+ job type for long user-started downloads. Those sections were not read in detail. — [Google Play policy: Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/9888379)
- **Play for On-device AI (beta):** It "brings the benefits of Android App Bundles and Google Play delivery to custom ML model distribution". Delivery is install-time, fast-follow or on-demand, and the docs say an install-time pack "will be installed as an APK". Each AI pack can be up to 1.5 GB compressed, and the total app size up to 4 GB. "AI packs only contain models. Java/Kotlin and native libraries are not allowed." It needs Android Gradle Plugin 8.8+ and the Play AI Delivery Library (shown at 0.1.1-alpha01). Play patches unchanged packs so users do not download them again. "Models downloaded by Play for On-device AI should only be used by your apps. Models shouldn't be offered to other apps." Targeting is by device model, system properties or RAM. — [Android Developers: Play for On-device AI (beta)](https://developer.android.com/google/play/on-device-ai)
- **PocketPal AI** is distributed on Google Play and downloads GGUF models from Hugging Face at runtime. — [pocketpal-ai GitHub](https://github.com/a-ghorbani/pocketpal-ai)

### Inferences
- **A runtime download is not "executable code" under Play's wording.** ONNX Runtime's native .so ships inside the APK, and only the .onnx weight files would come from outside. The graph runs inside ONNX Runtime and has no access to Android APIs. Even read broadly as "interpreted code", it falls under the interpreter carve-out rather than the ban.
- **AI packs are Google's preferred route for Nota.** hohe-w8.onnx (~723 MB) and punct-w8.onnx (~117 MB) each fit under the 1.5 GB per-pack cap. Play then hosts the files, patches updates and handles delivery, with no third-party host. The feature is still beta and the delivery library is alpha. A Flutter app would need a platform channel to the Play AI Delivery Library. The packs exist only for Play installs, not sideloaded APKs.
- The rule that models "shouldn't be offered to other apps" is no problem for Nota, which keeps the models in its own storage.

### Gaps
- Google Play's **AI-Generated Content policy** was not fetched. Whether it reaches speech-to-text of the user's own voice (not generative output) is unverified, though it seems unlikely.
- Google Play's base app size limits (base module or APK download cap) and any Play policy on large in-app downloads were not fetched.
- Whether the current Play for On-device AI text still says "beta", and its current library version, was not checked against the English page on the day.

## 3. How App Review and Play review test an app whose speech feature needs an 840 MB download, and what goes in review notes

### Takeaway
No primary source describes how reviewers handle large first-run downloads. The guidelines say only that the reviewer must be able to reach every feature: the back end must be on, features must be described "with specificity" in Notes for Review, and binaries with "obvious technical problems" are rejected. In practice the download host must be live during review, and the notes should say what the download is, how big it is and how to trigger it.

### Cited Findings
- 2.1(a): "include demo account info (and turn on your back-end service!)… Ensure the demo mode exhibits your app's full features and functionality. We will reject incomplete app bundles and binaries that crash or exhibit obvious technical problems." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 2.3.1(a): "All new features, functionality, and product changes must be described with specificity in the Notes for Review section of App Store Connect (generic descriptions will be rejected) and accessible for review." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 4.2.3(ii): disclose the size of first-launch downloads and prompt before downloading. — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Apple DTS advises confirming model-download behaviour with App Review: "requesting confirmation from App Review". — [Apple Developer Forums thread 793131](https://developer.apple.com/forums/thread/793131)

### Inferences
Suggested review-note content (inferred from 2.1 and 2.3.1, not from an Apple template):
- The speech models (~840 MB) download on first use of Record or Dictate after a prompt showing the size.
- The download is model weights only: no code, scripts or libraries. It runs in the bundled ONNX Runtime.
- Where the files are hosted, and roughly how long the download takes on Wi-Fi.
- That notes, tags and search work without the models.
- A short Amharic sample phrase, or an attached audio file the reviewer can import, so the reviewer can test transcription without speaking Amharic.

Two more points:
- If Apple-hosted asset packs or Play AI packs are used, the reviewer's install pulls the models through the store itself, so no external host has to be up during review.
- Play Console has an "App access" section for review instructions. It was not researched here (see Gaps).

### Gaps
- No primary source on reviewers' network conditions or any size or time limit they tolerate.
- Google Play's review instructions ("App access" declaration) and any Play guidance on review notes for downloadable content were not fetched.
- No developer accounts found of rejections or approvals for apps with model downloads around 1 GB.

## 4. Privacy labels and manifests: does a model download count as data collection, does server-side transcription count as collecting audio, and what the privacy manifest requires for network domains

### Takeaway
On both stores, a download that sends no user data is not "collection". Apple says an IP address "sent on a server call and not retained" need not be disclosed, and on-device processing is "not collected". Google treats only data transmitted off the device as collected, and on-device processing is out of scope.

Server-side transcription changes that. Audio leaves the phone, which makes it "Audio Data" (Apple) or "Voice or sound recordings" (Google) unless it is processed ephemerally. It also brings consent duties: 5.1.2(i) requires explicit permission before sharing with "third-party AI". And it breaks the "notes stay on this phone" promise that 2.3 requires the metadata to keep accurate.

Apple's privacy manifest lists only *tracking* domains. A model CDN does not go in it.

### Cited Findings
**Apple App Privacy (nutrition label)**
- "'Collect' refers to transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time." — [Apple: App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/) (no page date; ©2026)
- "Data that is processed only on device is not 'collected' and does not need to be disclosed in your answers. If you derive anything from that data and send it off device, the resulting data should be considered separately." — [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- On ephemeral server calls: "if an authentication token or IP address is sent on a server call and not retained, or if data is sent to your servers then immediately discarded after servicing the request, you do not need to disclose this in your answers in App Store Connect." — [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- On stored IP addresses: "You collect and store IP address from your users. Declare the relevant data types based on how you use IP address, such as precise location, coarse location, device ID, or diagnostics." — [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- "'Third-party partners' refers to analytics tools, advertising networks, third-party SDKs, or other external vendors whose code you've added to your app." Also: "You are not responsible for disclosing data collected by Apple." — [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- "Audio Data" is defined as "The user's voice or sound recordings". The guidance says to mark "'Audio Data' for voice recordings." — [Apple: App privacy details](https://developer.apple.com/app-store/app-privacy-details/)

**Apple App Review Guidelines on consent and sharing**
- 5.1.1(ii): "Apps that collect user or usage data must secure user consent for the collection, even if such data is considered to be anonymous…" — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- 5.1.2(i), as of the Nov 2025 update: "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

**Apple privacy manifest**
- `NSPrivacyTrackingDomains` lists "internet domains that an app or third-party SDK uses for tracking". If the user has not granted App Tracking Transparency permission, requests to those domains fail. The key is meaningful only with `NSPrivacyTracking` set to true, and it is available from iOS 17. — [Apple: NSPrivacyTrackingDomains](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacytrackingdomains.md) (via search summary; the full privacy-manifest page did not render in the fetch). Unity's docs show non-tracking SDKs with an empty array: [Unity: Apple privacy manifest](https://docs.unity.com/ugs/en-us/manual/iap/manual/apple-privacy-manifest)

**Google Play Data safety**
- "Collect" means transmitting data from the app off a user's device. "Sharing" means transferring collected user data to a third party. — [Google Play: Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)
- Two things are "not in scope for data collection":
  - user data "only processed locally on the user's device and not sent off device"
  - end-to-end encrypted data "unreadable by you or anyone other than the sender and recipient"

  — [Google Play: Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)
- Ephemeral processing means data "only stored in memory and retained for no longer than necessary to service the specific request in real-time". Such data "needs to be included in your form response", but if it meets that standard it "will not be disclosed in your app's Data safety section on Google Play". The tool's reading of this passage contradicts how the form is commonly understood (see Gaps). — [Google Play: Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)
- Not counted as sharing:
  - transfers to a "service provider" that processes data on the developer's behalf
  - transfers for legal purposes
  - transfers "based on a specific user-initiated action"
  - fully anonymized data

  — [Google Play: Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)
- Developers must reflect "user data transmitted off device from your app by libraries and/or SDKs used in your app". IP addresses are to be disclosed "based on their particular usage and practices", and approximate location inferred "via IP address… must be disclosed". — [Google Play: Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)
- "Voice or sound recordings" is defined as "A user's voice such as a voicemail or a sound recording." — [Google Play: Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)
- The form asks whether data is protected with "encryption in transit". — [Google Play: Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469)
- Flag: the page's change-log dates run from Dec 2021 to Dec 2023, with nothing in 2024–2026 shown. The current wording appears stable but may have changed in detail.

**Third-party hosts**
- Hugging Face's Terms say services are provided "in accordance with our Privacy Policy" and that HF may "aggregate, anonymize, or otherwise learn from data relating to your use of the Services". The terms themselves say nothing about IP logging. — [Hugging Face Terms of Service](https://huggingface.co/terms-of-service) (Effective Date 15 Sept 2022, older than 2024 and may have changed)

### Inferences
**Bundled models (inside the IPA/AAB, or in Apple-hosted packs or Play AI packs):** No new network endpoint and no data leaves the phone, so the privacy labels and Data safety form do not change. This is the strongest fit with "notes stay on this phone". Apple-hosted packs fall under "data collected by Apple", which the developer need not disclose. Play AI packs come from Google Play itself.

**Runtime download from a CDN, GitHub Releases or Hugging Face:** The request carries no user data beyond the IP address and user agent. Under Apple's wording, the developer does not retain an IP sent on a server call, so nothing needs declaring. The host is not "code you've added to your app", so it is not a "third-party partner". Google's "collect" is defined by data leaving the device, and a plain GET for a public file sends no user data of the kinds the form lists. Most apps in this position declare nothing.

There are two caveats:
- If Nota runs its own CDN and keeps access logs with IP addresses (for analytics or abuse control), Apple's "collect and store IP address" line could apply. The safe course is short log retention and no linking to users.
- Fetching from huggingface.co hands the user's IP to a third party under HF's privacy policy. The privacy policy, not necessarily the label, should say so.

**Server-side transcription (REST or WebSocket):**
- **Labels.** Audio leaves the device, so on Apple it is "Audio Data" collected for App Functionality, unless the server processes it in memory and "immediately discard[s]" it. Apple's ephemeral exemption would then technically apply. The transcript returned is also user content. On Google it is "Voice or sound recordings", which cannot use the end-to-end-encryption exemption because the server must decrypt the audio to transcribe it. It can at most be marked ephemeral.
- **Consent.** 5.1.1(ii) consent is needed. If the server calls a third-party ASR API, 5.1.2(i)'s explicit permission for "third-party AI" applies as well.
- **The promise.** Under 2.3's requirement that metadata, "including privacy information", stay accurate, the "notes stay on this phone" wording would have to change or be qualified for the server path.

**Privacy manifest:** A model host is not a tracking domain, so `NSPrivacyTrackingDomains` stays empty. If Nota checks free disk space before an 840 MB download, the disk-space API is a "required reason" API and needs a declared reason in the manifest. This was not verified here (see Gaps).

### Gaps
- **Google's ephemeral-processing rule is unclear.** The fetched summary says ephemeral data is entered in the form but not shown on the listing. That conflicts with the common understanding that ephemeral data is still shown as collected, with an "ephemeral" flag. Re-read the exact sentence before relying on it.
- Apple's privacy-manifest overview page and the required-reason API list (disk space, file timestamp) did not render, so the disk-space reason code (believed to be E174.1, "check whether there is sufficient disk space to write files") is unverified.
- Hugging Face's Privacy Policy (what it logs for anonymous downloads, and retention) was not fetched.
- No official Apple or Google statement found on whether third-party CDN access logs make the *app developer* a data collector.

## 5. Licences: CC BY 4.0 (Hohe), Apache-2.0 (punctuation model), and Hugging Face terms on re-hosting

### Takeaway
Both licences allow redistribution inside an app or on a CDN.

- **CC BY 4.0 (Hohe):** Nota must credit the creator and keep notices, link the source "to the extent reasonably practicable", say it modified the model (the 8-bit ONNX export is a modification), and name and link the licence. Credit may be given "in any reasonable manner based on the medium", so an in-app licences screen plus a NOTICE file next to hosted files works. Section 2(a)(5)(B) bars adding DRM or extra terms that restrict recipients.
- **Apache-2.0 (punctuation model):** Nota must include the licence text, mark changed files, and carry forward any NOTICE file. An in-app display is an allowed place for those notices.
- **Hugging Face terms:** They add no redistribution restrictions of their own and say licence references must not be removed.

### Cited Findings
**CC BY 4.0** — [CC BY 4.0 Legal Code](https://creativecommons.org/licenses/by/4.0/legalcode.en) (licence published 2013, stable text)
- **Adapted Material** is material "derived from or based upon the Licensed Material… in which the Licensed Material is translated, altered, arranged, transformed, or otherwise modified in a manner requiring permission under the Copyright and Similar Rights held by the Licensor."
- **3(a)(1):** "If You Share the Licensed Material (including in modified form), You must:"
  - (A) retain, if supplied, "(i) identification of the creator(s)… (ii) a copyright notice; (iii) a notice that refers to this Public License; (iv) a notice that refers to the disclaimer of warranties; (v) a URI or hyperlink to the Licensed Material to the extent reasonably practicable"
  - (B) "indicate if You modified the Licensed Material and retain an indication of any previous modifications"
  - (C) "indicate the Licensed Material is licensed under this Public License, and include the text of, or the URI or hyperlink to, this Public License."
- **3(a)(2):** "You may satisfy the conditions in Section 3(a)(1) in any reasonable manner based on the medium, means, and context in which You Share the Licensed Material."
- **3(a)(3):** The licensor may ask for attribution to be removed "to the extent reasonably practicable".
- **2(a)(5)(B):** "You may not offer or impose any additional or different terms or conditions on, or apply any Effective Technological Measures to, the Licensed Material if doing so restricts exercise of the Licensed Rights by any recipient of the Licensed Material."
- **2(b)(2):** "Patent and trademark rights are not licensed under this Public License."

**CC FAQ** — [Creative Commons FAQ](https://creativecommons.org/faq/)
- DRM is prohibited when used "to prevent others from exercising the licensed rights". "Not all kinds of encryption or access limitations are prohibited by the licenses."
- Credit can be given flexibly "depending on the medium, means, and context".
- "CC licenses can be used on databases."

**Apache-2.0 §4 (Redistribution)** — [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) (January 2004, stable; text quoted from the licence, not re-fetched in this session)
- Redistribution "in any medium, with or without modifications, and in Source or Object form" is allowed provided:
  - "(a) You must give any other recipients of the Work or Derivative Works a copy of this License"
  - "(b) You must cause any modified files to carry prominent notices stating that You changed the files"
  - "(c) … retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work"
  - "(d) If the Work includes a 'NOTICE' text file… any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file… within a NOTICE text file distributed as part of the Derivative Works; within the Source form or documentation, if provided along with the Derivative Works; or, within a display generated by the Derivative Works, if and wherever such third-party notices normally appear."

**Hugging Face Terms of Service** — [Hugging Face Terms of Service](https://huggingface.co/terms-of-service) (Effective 15 Sept 2022; flag as pre-2024)
- Uploaders keep ownership. For public repos, the uploader grants "each User a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use" the content.
- Open-source-licensed content "is intended to remain under the terms of such license".
- "Neither party is permitted to remove reference to any such license."
- No clauses on scraping, rate limits or using the Hub as an app CDN were found.

### Inferences
- **What Nota's Hohe attribution should contain:** creator ("snapwre", per the model card), the model's name and link (huggingface.co/snapwre/hohe-asr-amharic), "licensed under CC BY 4.0" with a link, the disclaimer reference, and a modification note such as "converted to ONNX and quantized to 8-bit by Nota". Put this on an in-app "Licences" or "About" screen and in a NOTICE file beside the hosted files. The desktop build already writes a licence `NOTICE` into `models/` (per the repo's CLAUDE.md), so the phone can reuse that text.
- **What the punctuation model needs:** ship the Apache-2.0 text and the upstream NOTICE file, if there is one, plus a "modified" notice for the cut-down vocabulary and quantization.
- **DRM.** App Store FairPlay encryption or Play delivery is unlikely to be "restricting" recipients, since the unmodified model stays freely available on Hugging Face and Nota imposes no extra terms. This is a judgement, not a sourced ruling (see Gaps). Nota should not add EULA terms that forbid extracting or reusing the model files.
- **Re-hosting is allowed.** Mirroring the ONNX files on a CDN or GitHub Releases is permitted under both licences, as long as the attribution travels with them.

### Gaps
- The CC FAQ answers on DRM, attribution format (TASL) and AI models were cut off in the fetch. Whether CC treats app-store DRM as a breach when the work is freely available elsewhere is unconfirmed.
- Whether model weights attract copyright at all (so that the licence binds) is unsettled law and was not researched.
- The Hohe model card's exact attribution request and any NOTICE in the punctuation model's upstream repo were not checked. The upstream base model's own licence (XLM-RoBERTa) was not checked either.

## 6. Cellular data: iOS App Store downloads over cellular, and expectations for large in-app downloads

### Takeaway
Since iOS 13, the App Store's cellular cap is a user setting. Its default, "Ask If Over 200 MB", means bundling 840 MB into the app would make most iPhone users confirm, or wait for Wi-Fi, before the app installs at all. For in-app downloads, Apple's only stated rule is 4.2.3(ii): disclose the size and prompt. No Apple or Google policy requiring Wi-Fi-only defaults was found, so a Wi-Fi-first default is a UX choice, not a compliance requirement.

### Cited Findings
- Settings > App Store > Cellular Data > App Downloads offers "Always Allow", "Ask If Over 200 MB" (the default) and "Always Ask". Roaming always prompts. iOS 13 turned the former hard 200 MB cellular cap into this optional limit. All secondary sources: [MacRumors](https://www.macrumors.com/how-to/download-large-apps-over-cellular-iphone-ipad/); [iDownloadBlog, Oct 2019](https://www.idownloadblog.com/2019/10/25/about-app-store-cellular-download-limit/); [9to5Mac, June 2019](https://9to5mac.com/2019/06/03/ios-13-removes-200-mb-file-size-limit-for-app-downloads-over-cellular/amp/). Flag: these date from 2019 and menu wording may differ on iOS 26; no current Apple Support page was retrieved.
- 4.2.3(ii): "disclose the size of the download and prompt users before doing so." — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Google's Play for On-device AI handles model delivery through Play, including fast-follow and on-demand modes. Its docs, as summarised, state no cellular rule. — [Android Developers: Play for On-device AI](https://developer.android.com/google/play/on-device-ai)

### Inferences
- **For Ethiopian users on metered mobile data, the download prompt should:**
  - state "about 840 MB" up front, with the speech model separable from the 117 MB punctuation model if useful
  - default to Wi-Fi only, with an explicit "use mobile data" override
  - resume after interruptions
  - verify checksums (the desktop build already writes `manifest.json`)
- **Bundling 840 MB in the IPA hits the App Store cellular prompt at install time.** That deters installs before the user has seen the app, so keeping the base app small and downloading the models on demand (Apple-hosted asset packs, Play AI packs, or a CDN) suits this audience better.
- **Updates.** With Play AI packs, unchanged models are not downloaded again, because Play patches only changed files. A CDN download needs Nota's own versioning, for example a manifest hash, to avoid downloading 840 MB again when the app updates.

### Gaps
- No current (2025–2026) Apple Support page for the cellular download setting was retrieved. Whether iOS 26 changed the default threshold is unverified.
- Apple's networking guidance (URLSession `allowsCellularAccess` / `allowsExpensiveNetworkAccess`, Low Data Mode) and Android's guidance on metered networks and user-initiated data transfer jobs were not fetched, so best practice there rests on general knowledge, not cited sources.
- No Google Play policy on in-app large downloads over mobile data was found.
