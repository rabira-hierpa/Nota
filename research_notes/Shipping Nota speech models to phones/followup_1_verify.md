# Verify: do Apple-hosted essential asset packs reach App Review and users before first launch (Nov 2026)?

Claim tested: "App Review tests the app with pre-launch downloads disabled, so a size-disclosing download screen is mandatory; the 2026 forum reports of review failures and missing files are unresolved" (comparable_apps.md). Rival claims: "essential packs are ready at first launch" (store_native_delivery.md) and "the reviewer's install pulls the models through the store, so no host has to be up during review" (store_policy_privacy.md).

Verdict: **the claim mostly holds, and I could not refute it.** Two points need care:
- "Pre-launch downloads are disabled for App Review" comes from one Apple staff member (a Frameworks Engineer) on Apple's own forum. **No Apple documentation or App Store Connect help page says it.** I checked six of them. It is an Apple statement, but not a documented one.
- The "ready at first launch" claim in store_native_delivery.md is true only in the normal case. Apple's own documentation says an essential pack can still be missing at launch.
- The inference in store_policy_privacy.md is **contradicted**. Reviewers don't get pre-launch downloads, and from February to September 2026 several developers reported that the review environment couldn't reach Apple-hosted packs at all.
- As of the latest visible posts, nothing is fixed. Apple's most recent reply (September 2026) says "We're looking into the issue on our side."

All sources were fetched on 6 November 2026. Forum posts show only the month and year. Everything cited is from 2025–2026. The In-App Content setting dates from iOS 16.1 (2022), but the wording quoted below is from Apple's current iPhone User Guide.

## Do Apple-hosted essential asset packs reach App Review and ordinary users before first launch? Or must the app always have its own size-disclosing download screen? Are the 2026 reports resolved?

### Takeaway
For most App Store users who keep In-App Content on (the default, per Apple staff), an essential pack downloads during install. App Review is different: an Apple engineer says it has pre-launch downloads turned off. Users can turn them off too, and Apple's documentation says even essential packs can fail to download. So Nota needs its own download screen that shows the size (Guideline 4.2.3(ii)) whatever store delivery it uses. App Review's problems reaching Apple-hosted packs were reported from February to September 2026 and are not shown as fixed. A separate production report (September 2026) describes failures on iOS 26.4–26.6, including packs marked downloaded whose files are missing.

### Cited Findings

**What Apple staff said about App Review (Apple's forum, not documentation)**
- Thread "Apple-Hosted Asset Pack Support in App Review" (App Review forum, 11 replies). Apple Frameworks Engineer, Mar 2026: "By default, asset packs work differently for App Review than for App Store and TestFlight users. Specifically, pre-launch downloads are disabled for App Review, which mirrors the experience that an App Store or TestFlight user would see if they previously disabled background downloads on their device by going to Settings > Apps > App Store and turning off In-App Content. The setting is on by default, but users can turn it off if they choose." — [Apple Developer Forums thread 815174](https://developer.apple.com/forums/thread/815174)
- Same post: "you still need to display the download size on that screen per App Review Guideline 4.2.3 (ii)… The easiest way to determine the download size is to look at an asset pack's `downloadSize` property". It adds: "None of this applies in the normal case in which the user didn't disable background downloads because then, downloads finish before the user can open your app." — [thread 815174](https://developer.apple.com/forums/thread/815174)
- Same engineer, Mar 2026, on checking whether a download is needed: call `status(ofAssetPackWithID:)` and look for `.downloaded`, or on OS 26.4 call `assetPackIsAvailableLocally(withID:)`. — [thread 815174](https://developer.apple.com/forums/thread/815174)
- The thread's only accepted answer is from an App Store Connect Engineer, Feb 2026, replying to an App Review "A server with the specified hostname could not be found" error: "This should now be resolved. If you're still seeing issues with your review, please contact us." The original poster replied that they could not confirm it. — [thread 815174](https://developer.apple.com/forums/thread/815174)

**What Apple's documentation says (primary, current)**
- The six documentation and App Store Connect help pages I read don't mention App Review turning off pre-launch downloads. They are: "Downloading Apple-hosted asset packs", "Creating managed asset packs", "Overview of Apple-hosted asset packs", "Submit Apple-hosted asset packs", "Test Apple-hosted asset packs" and "Apple-hosted asset pack statuses". — [Apple: Downloading Apple-hosted asset packs](https://developer.apple.com/documentation/backgroundassets/downloading-apple-hosted-asset-packs); [Creating managed asset packs](https://developer.apple.com/documentation/backgroundassets/creating-managed-asset-packs); [ASC Help: Overview](https://developer.apple.com/help/app-store-connect/manage-asset-packs/overview-of-apple-hosted-asset-packs); [ASC Help: Submit](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-apple-hosted-asset-packs); [ASC Help: Test](https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-apple-hosted-asset-packs); [ASC Help: Statuses](https://developer.apple.com/help/app-store-connect/reference/app-uploads/apple-hosted-asset-pack-statuses)
- Definition of essential: "Downloads the asset pack as part of the app's installation process. The asset-pack download contributes to the overall download progress that people see in the App Store, in TestFlight, and on the Home Screen". Prefetch "Downloads the asset pack during the app's installation process, but lets it continue in the background after installation finishes." On-demand downloads "only when you explicitly use an API to request the asset pack." — [Apple: Creating managed asset packs](https://developer.apple.com/documentation/backgroundassets/creating-managed-asset-packs)
- Apple's own caveat: "Note: Even for an asset pack with an essential download policy, network dropouts or other uncommon issues can prevent the system from downloading it until you call the `ensureLocalAvailability(of:)` method." And: "For an asset pack with an essential or a prefetch download policy, the system may finish downloading the asset pack before you call this method." — [Apple: Downloading Apple-hosted asset packs](https://developer.apple.com/documentation/backgroundassets/downloading-apple-hosted-asset-packs)
- `ensureLocalAvailability(of:)` (iOS 26.0+): "If it isn't [downloaded], then the system schedules it to be downloaded and waits for the download to complete… If the method throws, then the asset pack isn't guaranteed to be available locally." — [Apple: ensureLocalAvailability(of:)](https://developer.apple.com/documentation/backgroundassets/assetpackmanager/ensurelocalavailability(of:))
- `downloadSize` (iOS 26.0+): "The size of the download file containing the asset pack in bytes… This is different than the installation size, which could be larger." — [Apple: AssetPack.downloadSize](https://developer.apple.com/documentation/backgroundassets/assetpack/downloadsize)
- Managed Background Assets needs apps "targeting iOS 26… and later". Apple-hosting is for apps "distributed through TestFlight and the App Store". — [ASC Help: Overview of Apple-hosted asset packs](https://developer.apple.com/help/app-store-connect/manage-asset-packs/overview-of-apple-hosted-asset-packs)
- Asset packs are reviewed separately. "If your app hasn't been approved yet… include the asset pack version in the same submission as your first app version." "Once an asset pack version is approved for the App Store, it'll automatically be available to all App Store users, and any previous versions of the asset pack will be replaced". — [ASC Help: Submit Apple-hosted asset packs](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-apple-hosted-asset-packs)
- TestFlight: "To download asset packs in TestFlight, testers must be signed in to their device with an Apple Account that has access to the beta app. Sandbox accounts aren't supported." External testing of a pack needs TestFlight App Review approval. — [ASC Help: Test Apple-hosted asset packs](https://developer.apple.com/help/app-store-connect/test-a-beta-version/test-apple-hosted-asset-packs)

**The user-side setting (primary)**
- Settings > Apps > App Store: "In-App Content: Automatically download in-app content in the background before the first time you open the app." The guide is current (it mentions iOS 27) and doesn't say what the default is. "On by default" comes only from the Apple engineer above. — [Apple iPhone User Guide: Change settings and restrictions in the App Store](https://support.apple.com/guide/iphone/change-settings-and-restrictions-iph3dfd91de/ios)

**Review-environment failures, Feb–Sep 2026 (developer reports on Apple's forum, with Apple staff replies)**
- Feb 2026: App Review hit "A server with the specified hostname could not be found" from `ensureLocalAvailability`. Apple: "should now be resolved". — [thread 815174](https://developer.apple.com/forums/thread/815174)
- Mar 2026: a first submission with essential packs was rejected because the reviewer saw the fallback screen, and the appeal was rejected. Apr 2026, same developer: "Upon submitting our first patch, we are running into the exact same situation again… Something definitely still appears wrong here in the review process." — [thread 815174](https://developer.apple.com/forums/thread/815174)
- May 2026: the macOS (Catalyst) build was stuck in review because even `assetPack(withID:)` lookups failed for the reviewer. A second developer reported the same. Apple Frameworks Engineer, May 2026: "We're looking into the issue and will reach out if we need more information." — [thread 827249](https://developer.apple.com/forums/thread/827249); [thread 815174](https://developer.apple.com/forums/thread/815174)
- Jun 2026: the same developer said App Review told them in a chat that "this is indeed a technical issue with the review environment, where the app doesn't have access to the on-demand asset pack. While they are working on fixing this". App Review recommended explaining the issue in the review notes and, ideally, offering "a demo mode" that works without the pack. **This is App Review's word passed on by a developer, not an Apple post.** — [thread 827249](https://developer.apple.com/forums/thread/827249)
- Jun–Aug 2026: another new app got "A server with the specified hostname could not be found" in App Review while its packs showed "accepted". A DTS engineer (Jun 2026) asked for more detail. A Frameworks Engineer (Jul 2026): "We'll look into the issue that you're facing." No resolution is posted. — [thread 834699](https://developer.apple.com/forums/thread/834699)
- Aug 2026: a new app that needs an essential pack was "failing to get through App Review because the reviewer doesn't have access to the asset pack". On iOS "the download fails or never proceeds past the first 0% progress". Switching from `preFetch` to `essential` "still didn't work". Their earlier TestFlight review "let it pass through without verification because it was a known issue." Apple Frameworks Engineer, Sep 2026: "We're looking into the issue on our side." This is the latest Apple reply on the review problem that I found. — [thread 843872](https://developer.apple.com/forums/thread/843872)

**The iOS 26.5 / TestFlight "missing files" report, and wider production failures**
- Jun 2026 (thread 815174): a developer couldn't get Apple-hosted packs working "on iOS 26.5 even in testflight". The download completed, but "the files in the aar dont exist in the namespace". The Apple Frameworks Engineer's reply pointed to that app's app ID / bundle ID mismatch: app ID `T2VN6R4V2H.AtlasDrift.SnapTrail`, bundle ID `AtlasDrift.SnapTrail`, which is not reverse-DNS. Fixing it "will require that you create a new app record in App Store Connect and re-upload your asset packs." — [thread 815174](https://developer.apple.com/forums/thread/815174)
- Same developer's own thread, Apr–Jun 2026. Daemon logs showed LaunchServices error -10814 ("bundle record couldn't be looked up"). Apple (May 2026) promised a follow-up through Feedback Assistant. The accepted answer is the developer's own: "currently in iOS version 26.5 or earlier, app bundle id cannot have a prefix > 10 characters for downloads to succeed." Apple hasn't confirmed this, and it doesn't quite fit their own ID, whose first component is exactly 10 characters. — [thread 824586](https://developer.apple.com/forums/thread/824586)
- Sep 2026, production: an App Store app with 14 on-demand Apple-hosted packs, about 955 MB in all, released 12 September 2026, reported results for 7,384 devices: "68% completed; 6% ended in a hard failure that retries do not fix; about 25% never completed (many runs were cancelled because the BGContinuedProcessingTask expired)."
  - `NSURLErrorDomain -3007` hit 186 devices, only on iOS 26.4 and later: about 7% on 26.4/26.5, about 1.3% on 26.6.x, none on 26.0–26.3.
  - On 178 devices "ensureLocalAvailability returns successfully, but the pack's files are not in the app-group namespace". Only a reinstall fixed it.
  - About 100 devices got no progress events at all.
  - They "had to ship a hotfix that bundles the 3D content inside the app again."
  - Apple DTS (Quinn, Sep 2026): "this all sounds very bugworthy" (FB24785997). No fix is posted.
  — [thread 845723](https://developer.apple.com/forums/thread/845723)
- Apple's Background Assets forum tag on 6 Nov 2026 lists more open reports. **I saw these only in the listing and did not open the threads.**
  - An iOS 27 report, "Managed asset pack download fails with `PipelineNotFound` at 100% after the app is backgrounded" (posted hours before).
  - A macOS 26.6.1 report of failures with -1200 / -3007 (Aug 2026).
  - A macOS 27 seed 6 trap (Sep 2026).
  — [Apple Developer Forums: Background Assets tag](https://developer.apple.com/forums/tags/background-assets)

**Release notes (primary)**
- iOS & iPadOS 26.4:
  - Background Assets new features: `localStatus(ofAssetPackWithID:)`, `assetPackIsAvailableLocally(withID:)` and `ensureLocalAvailability(of:requireLatestVersion:)`.
  - One resolved issue: "Fixed: Apps might crash when downloading asset packs. (169648111)".
  — [iOS & iPadOS 26.4 Release Notes](https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-26_4-release-notes)
- The iOS & iPadOS 26.5 and 26.6 release notes don't mention Background Assets or asset packs. — [26.5](https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-26_5-release-notes); [26.6](https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-26_6-release-notes)
- The iOS & iPadOS 27 release notes list only one Background Assets change, a new feature: "You can reduce your app's storage usage with localized asset packs." No resolved issues are listed. — [iOS & iPadOS 27 Release Notes](https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes)
- At WWDC26 the Background Assets news was localized packs and the gradual deprecation of On-Demand Resources from iOS 27. No change to App Review behaviour was announced. — [WWDC26 session 378](https://developer.apple.com/videos/play/wwdc2026/378) (via search summary; transcript not read in full)

**Secondary**
- A May 2026 developer blog (Stefan Schmitt) recommends uploading the build and the packs in one submission, checking that both appear under "Items to Review", and considering `prefetch` "so the model is already there when the reviewer" opens the feature. It does not discuss App Review turning off pre-launch downloads. **Secondary.** — [schmittsfn.com](https://schmittsfn.com/blog/2026/background-assets-in-production) (2026-05-20)

### Inferences
- **The claim stands, with one correction.** "Disabled for App Review" is an Apple staff statement on Apple's forum, not documented behaviour. Nothing from Apple contradicts it. One developer reports that switching to `essential` didn't make the reviewer's install download the pack, which supports it.
- **The two notes don't really disagree.** store_native_delivery.md (WWDC25) describes the normal user case, which the same Apple engineer confirms. comparable_apps.md describes App Review and users who turned In-App Content off. Nota has to handle both cases.
- **Nota needs its own download screen in every case.** It must show the size (from `downloadSize`, or the file sizes if Nota hosts the files) and ask before downloading. Four things make this unavoidable:
  - App Review runs without pre-launch downloads.
  - Users can turn In-App Content off.
  - Apple's documentation says essential packs can fail to download.
  - Nota's iOS 16–25 users can't use Managed Background Assets at all.
  Apple-hosted packs can only be one source behind that screen, for iOS 26+. They can't replace it.
- **store_policy_privacy.md's inference should be withdrawn.** It says "the reviewer's install pulls the models through the store, so no host has to be up during review", which the evidence contradicts. Apple's servers are the host, and the reviewer's environment repeatedly couldn't reach them from February to September 2026.
- **To get through review with Apple-hosted packs, Nota would need two things:**
  - Review notes explaining the pack. App Review itself recommended this, according to a developer.
  - A way to test speech without the pack: a "demo mode", or a fallback download from Nota's own host.
  The notes, tags and search features that work without models help show the app is useful.
- **The iOS 26.5 "missing files" case in thread 815174 was probably that developer's own setup.** Their bundle ID wasn't reverse-DNS and didn't match their app ID. Nota's bundle ID is `com.rzcodes.nota` (mobile/ios/Runner.xcodeproj), standard reverse-DNS with a 3-character first part. If the unconfirmed "prefix > 10 characters" rule is real, it shouldn't affect Nota. That is inference only.
- **The September 2026 production report is the strongest evidence against relying on Apple-hosted packs alone.** It describes a ~955 MB payload, close to Nota's ~840 MB. About 2.4% of devices (178/7,384) had a pack marked downloaded with its files missing, and 6% had hard failures. If Nota uses Apple-hosted packs, it should do three things:
  - After `ensureLocalAvailability` succeeds, check that the expected files exist and their sizes match `hohe-w8.onnx` (723,419,839 bytes) and `punct-w8.onnx` (117,182,179 bytes).
  - Offer `remove(assetPackWithID:)` and a retry.
  - Keep a fallback source.
- Because the -3007 failures appear from iOS 26.4 on, and no fix appears in the 26.5, 26.6 or 27 release notes, the problems should be treated as current in November 2026.

### Gaps
- No Apple documentation or App Store Connect help page states that App Review turns off pre-launch downloads, or how reviewer devices get packs. The only source is the March 2026 forum post. App Review's guideline text for asset packs wasn't found.
- I found no Apple statement that the review-environment issue is fixed. The latest Apple reply I found (September 2026, thread 843872) says Apple is still looking into it. Apple may have fixed it without saying so; the forum doesn't show it.
- I found no Apple statement on whether an essential pack's install-time download honours the cellular download limit or asks for consent on mobile data. This matters for users in Ethiopia.
- FB24785997, FB22599462 and the other Feedback reports aren't public, so their status is unknown.
- The iOS 27 `PipelineNotFound` thread (848686) and the macOS threads were seen only in the forum listing, not read in full.
- I didn't check the iOS 27.1 or 27.2 release notes (the 27.1 notes URL returned 404). A fix could be listed there.
- I found no first-hand report of a Flutter app shipping Apple-hosted packs. The Swift downloader extension and the platform channel that Nota would need were out of scope.
