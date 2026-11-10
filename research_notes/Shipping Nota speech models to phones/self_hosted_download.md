# Self-hosted model download on first launch (Flutter, ~840 MB ONNX pair)

Scope: hosting the two 8-bit ONNX files (hohe-w8.onnx 723,419,839 B + punct-w8.onnx 117,182,179 B + small JSON/NOTICE = 840.6 MB decimal, 0.783 GiB per full download) outside the app stores, and downloading them into the Flutter app. Research date: 6 November 2026. Every page below was read on that date. "Accessed" means the page showed no date of its own. App-store-hosted delivery (Apple Background Assets, Play Asset Delivery) is outside this scope.

Local starting point: the desktop build already writes `models/manifest.json` with the upstream repo and pinned revision for each model (Hohe `217712df…`, punctuation `1-800-BAD-CODE/xlm-roberta_punctuation_fullstop_truecase@d1769a59…`), the toolchain (`torch 2.8.0`, `transformers 5.15.1`, `onnxruntime 1.31.0`), and `bytes` plus `sha256` for each file, e.g. `hohe-w8.onnx` → `24df360e…ced7f` (`/Users/rz/rz-codes/amharic-stt/models/manifest.json`, `scripts/build_speech_models.py` lines 35–39, 61–69, 401). The phone-side manifest can reuse this file.

## Hosting options: limits, terms and monthly cost for 1k / 10k / 100k full downloads

### Takeaway
At these volumes, egress is the only cost that matters. Storage for one or two model versions (≤2 GB) and request fees are effectively nil everywhere. Cloudflare R2 (free egress), Hugging Face Hub and GitHub Releases all cost $0 even at 100,000 downloads a month. CloudFront's $15 flat-rate Pro plan covers up to about 59,000 downloads a month. Metered CDNs and clouds cost about $50–$9,000 a month at the top scale, depending on vendor. R2 has one important catch: a 723 MB file is larger than Cloudflare's 512 MB cacheable-file limit on non-Enterprise plans, so the file must be split into parts to be edge-cached.

### Cited findings
**Cloudflare R2** (pricing page last updated 30 Oct 2026)
- Standard storage costs $0.015/GB-month. Class A operations cost $4.50 per million, Class B $0.36 per million, and egress is free. The monthly free tier is 10 GB-month of storage, 1M Class A operations and 10M Class B operations. `GetObject` is a Class B operation. The page does not say how range requests are counted. — [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- Egress through the Workers API, the S3 API or `r2.dev` "does not incur data transfer (egress) charges". The page also warns that other metered services connected to a bucket may charge. — [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- "Public access through `r2.dev` subdomains is rate-limited and should only be used for development purposes." A custom domain "must have been added as a zone in the same account as the R2 bucket", and it "allows you to use Cloudflare Cache". (Page updated 25 Sep 2026.) — [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- Cacheable file size limit: "Free, Pro and Business customers have a limit of 512 MB". For Enterprise the default maximum is 5 GB. (Page updated 14 Sep 2026.) — [Cloudflare default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)

**Hugging Face Hub** (accessed)
- Public storage for free users and organisations is "Best-effort". Beyond "the first few gigabytes", HF asks users to upload content of real value. The hard limit for a single file is 500 GB and the recommended maximum is under 200 GB. "Files are served to the users using CloudFront." — [HF storage limits](https://huggingface.co/docs/hub/storage-limits)
- Rate limits apply per 5-minute window. Anonymous users get 3,000 "Resolver" (`/resolve/` file download) requests per IP address, and free logged-in users get 5,000. These anonymous and free limits are "subject to change over time depending on platform health". Going over returns HTTP 429. The table is labelled "current rate limits (in September '25)". — [HF rate limits](https://huggingface.co/docs/hub/rate-limits)
- The HF docs say nothing about bandwidth charges for public repos. Neither page states a bandwidth cap or a price. — [HF storage limits](https://huggingface.co/docs/hub/storage-limits), [HF rate limits](https://huggingface.co/docs/hub/rate-limits)
- Observed on 6 Nov 2026: `GET https://huggingface.co/snapwre/hohe-asr-amharic/resolve/main/lm/am-5gram.bin` returns `302` to `https://us.aws.cdn.hf.co/xet-bridge-us/…` with headers `accept-ranges: bytes`, `x-linked-size`, `x-linked-etag` (a 64-hex content hash), `x-xet-hash` and `x-repo-commit: 217712df…` (the same revision Nota pins). A range request on the redirect target returns `206` with a strong `etag` and a `content-range`. The signed redirect URL carried `Expires=` about 1 hour ahead (17:43 → 18:43 UTC). — direct `curl -I` observation of [the Hohe repo](https://huggingface.co/snapwre/hohe-asr-amharic)
- Hohe's Hub model card licence is `cc-by-4.0`. — [HF API for snapwre/hohe-asr-amharic](https://huggingface.co/api/models/snapwre/hohe-asr-amharic)

**GitHub Releases** (accessed)
- "Up to 1000 release assets may be associated with a single release." "Each file included in a release must be under 2 GiB." "There is no limit on the total size of a release, nor bandwidth usage." — [GitHub Docs: About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- The Acceptable Use Policies, section 9 (Excessive Bandwidth Use), say GitHub may limit file hosting or suspend an account if usage is "significantly excessive in relation to other users of similar features". It may also delete repositories that place "undue strain on our infrastructure". The page has no CDN-specific clause. (Its only date is a localization update on 2026-03-11.) — [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)

**AWS CloudFront** (pages © 2026)
- The pay-as-you-go always-free tier gives 1 TB of transfer out and 10M HTTP(S) requests each month. Per-GB rates for the "South Africa, Kenya, Nigeria, Egypt, Middle East" region are $0.110 for the next 9 TB, $0.105 for the next 40 TB and $0.090 for the next 100 TB. US/Europe rates are $0.085, $0.080 and $0.060. HTTPS requests in Africa cost $0.0120 per 10,000. — [CloudFront pay-as-you-go pricing](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/)
- Flat-rate plans are priced per distribution per month and advertise "no overage charges". Free is $0 (1M requests, 100 GB, 5 GB of S3). Pro is $15 (10M requests, 50 TB, 50 GB of S3). Business is $200 (125M requests, 50 TB, 1 TB of S3). Premium is $1,000 (500M requests, 50 TB, 5 TB of S3) and can be raised up to 600 TB at a new flat price. Transfer from AWS origins to CloudFront is waived on flat-rate plans. — [CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)

**Backblaze B2** (accessed)
- Storage costs $6.95/TB/month, and the first 10 GB is free. Egress is free up to 3× the average monthly stored data, then $0.01/GB. Egress through partners is free: the page names Fastly, Cloudflare, bunny.net, CacheFly and others. Class A, B and C calls are free for pay-as-you-go accounts. — [Backblaze B2 pricing](https://www.backblaze.com/cloud-storage/pricing)

**Bunny CDN** (accessed)
- The Standard network (119 PoPs) charges per GB: Europe and North America $0.01, Asia and Oceania $0.03, South America $0.045, Middle East and Africa $0.06. The Volume network (10 PoPs) charges $0.005/GB for the first 500 TB. The minimum is $1 a month. Bunny Storage starts at $0.01/GB. — [Bunny CDN pricing](https://bunny.net/pricing/cdn/)

**Google Cloud Storage** (accessed)
- Standard storage in US regions costs $0.000027397 per GiB-hour, about $0.02/GiB-month. Internet transfer to "Worldwide Destinations (excluding Asia & Australia)" costs $0.12/GiB for 0–10 TiB, $0.11 for 10–150 TiB and $0.08 above 150 TiB. With Cloud CDN, "Cloud Storage data transfer charges are waived, but cache fill charges may apply". — [GCS pricing](https://cloud.google.com/storage/pricing)

### Cost estimate (egress only; computed from the cited prices)
Assumptions: 840.6 GB per 1,000 downloads (0.783 GiB each). Every byte is billed at the Africa/Middle East rate where rates vary by region. No retries are re-billed. Two model versions are stored (≤1.7 GB). Requests are ≤20 per download, which fits every free request tier.

| Host | 1,000 /mo (0.84 TB) | 10,000 /mo (8.4 TB) | 100,000 /mo (84 TB) | Notes |
|---|---|---|---|---|
| Cloudflare R2 (custom domain) | ~$0 | ~$0 | ~$0 (2M Class B ops < 10M free) | Needs a domain on Cloudflare. A 723 MB file is above the 512 MB cache limit, so split it into parts to be edge-cached |
| Hugging Face Hub (public repo) | $0 | $0 | $0 | Best-effort public storage. Anonymous limit of 3,000 resolver requests per 5 min per IP |
| GitHub Releases | $0 | $0 | $0 | 2 GiB per asset (fits). The AUP "excessive bandwidth" clause applies |
| CloudFront flat-rate Pro | $15 | $15 | over the 50 TB allowance; Premium needs a custom raise | 50 TB ≈ 59,000 downloads |
| CloudFront pay-as-you-go (Africa rate) | $0 (1 TB free) | ≈ $815 | ≈ $8,255 | 9 TB × 0.110 + 40 TB × 0.105 + 34 TB × 0.090 |
| Bunny Standard (ME & Africa $0.06) | ≈ $50 | ≈ $504 | ≈ $5,044 | The European rate of $0.01/GB applies if users are served from EU PoPs |
| Bunny Volume ($0.005) | ≈ $4 | ≈ $42 | ≈ $420 | Only 10 PoPs, probably none in Africa (not verified) |
| Backblaze B2 direct ($0.01 above 3× storage) | ≈ $8 | ≈ $84 | ≈ $840 | No CDN. B2 to Bunny or Cloudflare is free egress |
| Google Cloud Storage direct ($0.12/0.11 per GiB) | ≈ $94 | ≈ $940 | ≈ $8,714 | Always Free allowance not checked |

### Inferences
- R2 behind a Cloudflare custom domain is the cheapest host the app controls itself. To be cached at Addis Ababa or Nairobi, hohe-w8.onnx (723 MB) should be split into parts of 512 MB or less. Two parts of about 362 MB each, or several ~100 MB parts, would work; the app joins them and checks the whole-file SHA-256. Otherwise every request misses the cache and is served from the bucket's region. Smaller parts also make resume and retry cheaper on poor networks.
- HF Hub is the lowest-effort host: no bill, CloudFront delivery, Range/ETag support and SHA-256 headers. Its downsides are best-effort terms, per-IP rate limits that are "subject to change", and signed redirect URLs that expire after about an hour. That last point means a resume after a long pause must start again from the `huggingface.co/.../resolve/<commit>/...` URL, not from the CDN URL.
- GitHub Releases also costs nothing and allows files up to 2 GiB. Bulk distribution of an 840 MB binary to tens of thousands of phones is the kind of use the AUP's "significantly excessive" bandwidth clause leaves to GitHub's discretion, though.
- A sensible layout uses a primary host and a fallback (for example R2 primary, HF Hub fallback) listed in the manifest, so the app can switch hosts if one throttles or is blocked.
- Every host sees the downloader's IP address and user agent. No note data is involved, but a privacy note should say that the model download goes to a CDN.
- Licence obligations when re-hosting. CC BY 4.0 §3(a) requires keeping the creator identification, copyright notice, licence notice, disclaimer notice and a URI/hyperlink "to the extent reasonably practicable". It also requires saying whether the material was modified. These conditions may be met "in any reasonable manner based on the medium, means, and context", for example with a link. Under §2(a)(4), purely technical format changes "never produce Adapted Material". Exporting to ONNX may be such a change, but 8-bit quantisation is arguably a modification, so the NOTICE should say "converted to ONNX and quantized to 8-bit". — [CC BY 4.0 legal code](https://creativecommons.org/licenses/by/4.0/legalcode.en). Nota already writes a NOTICE naming both models, their revisions and their licences (`scripts/build_speech_models.py` lines 61–69). Shipping that NOTICE next to the files on the host, and showing it in the app, covers both licences.

### Gaps
- I did not fetch AWS S3 direct internet egress pricing or the GCS Always Free egress allowance.
- What happens when a CloudFront flat-rate plan's 50 TB allowance is used up (throttling, a forced upgrade, or nothing) was not stated on the page I read.
- Whether Cloudflare's CDN service-specific terms limit serving large non-HTML binaries through the CDN, as opposed to R2 behind it, was not checked.
- Hugging Face publishes no bandwidth terms for public repos. Whether an app sending a large user base to `/resolve/` URLs is welcome in the long term is not documented. The per-IP limit might bite behind mobile carrier-grade NAT; I found no data on Ethiopian carriers' NAT practices.
- I could not confirm which CDN serves GitHub release assets.
- I did not fetch the Apache-2.0 redistribution text (§4: licence copy, NOTICE). The existing NOTICE suggests it is already handled.

## CDN reach in Ethiopia / East Africa

### Takeaway
Cloudflare lists PoPs in Addis Ababa itself, and also in Djibouti, Nairobi, Mombasa, Kampala and Kigali. CloudFront, which Hugging Face uses, has edges in Nairobi (since 2020). Bunny has a Nairobi PoP and about 7 African PoPs. None of the sources gives measured download speeds from Ethiopia, and whether Ethiopian ISPs actually route to these PoPs is unverified.

### Cited findings
- Cloudflare's network page lists Addis Ababa, Djibouti, Kampala, Kigali, Mombasa and Nairobi among "348 cities". — [Cloudflare network](https://www.cloudflare.com/network/) (accessed)
- Third-party monitors also list a Cloudflare "Addis Ababa, Ethiopia – (ADD)" location. — [openstatus](https://www.openstatus.dev/status/cloudflare/addis-ababa-ethiopia-add), [getdeploying](https://getdeploying.com/datacenters-in-ethiopia) (secondary)
- AWS announced CloudFront's first edge locations in five new countries, including Nairobi, Kenya, in January 2020 (older than 2024, so the number of edges may have changed). — [AWS What's New, Jan 2020](https://aws.amazon.com/about-aws/whats-new/2020/01/cloudfront-kenya-bulgaria-greece-hungary-romania)
- One secondary source says AWS now lists three CloudFront PoPs in Nairobi; Netify lists one. These conflict, and neither is primary. — [Lineserve](https://www.lineserve.net/blog/does-aws-have-a-region-in-kenya), [Netify](https://www.netify.ai/resources/cdn/amazon-cloudfront/country/ke)
- Hugging Face serves files through CloudFront. The observed redirect host was `us.aws.cdn.hf.co`. — [HF storage limits](https://huggingface.co/docs/hub/storage-limits); direct observation (see above)
- Bunny's docs list 7 PoPs in Africa out of 119+. Its marketing page claims 13 across Africa and the Middle East. — [Bunny regions docs](https://docs.bunny.net/cdn/regions) (last-modified date truncated); [Bunny Africa & ME page](https://bunny.net/cdn/content-delivery-africa-and-middle-east/) (via search snippet)
- Bunny announced a Nairobi PoP aimed at Kenya, Uganda, Tanzania and Burundi, claiming latency in Kenya fell by more than 85%. — [Bunny blog](https://bunny.net/blog/bunny-net-expands-into-nairobi-kenya-supercharging-north-east-africa) (seen only as a search snippet, undated)

### Inferences
- Cloudflare has the closest footprint (an in-country Addis Ababa PoP). That only helps if the files are cacheable, meaning parts of 512 MB or less on Free, Pro or Business, and if the user's ISP is routed to ADD. A cold cache on a low-traffic PoP means the first downloads per PoP still go back to R2.
- Download time is mostly the user's last-mile bandwidth. For 840.6 MB (6,725 Mbit): about 11 minutes at 10 Mbps, about 22 minutes at 5 Mbps, about 1 hour 52 minutes at 1 Mbps, and about 3 hours 44 minutes at 0.5 Mbps. The slowest case is close to iOS's default 4-hour `resourceTimeout` in background_downloader (see below).

### Gaps
- I found no measured throughput or latency from Ethio Telecom or Safaricom Ethiopia to Cloudflare ADD, CloudFront Nairobi or Bunny Nairobi.
- I found no source on whether Ethiopian ISPs peer locally with these CDNs, or whether Cloudflare routes Free/Pro plan traffic through ADD.
- Whether Bunny's Volume network has any African PoP was not verified.

## Download mechanics in Flutter (background_downloader, iOS URLSession, Android UIDT/WorkManager)

### Takeaway
background_downloader (v9.6.6, published about 5 Nov 2026) already wraps the right native mechanisms. On iOS it uses a background URLSession. On Android it uses WorkManager, with JobScheduler UIDT on 14+. It supports pause/resume, Wi-Fi-only, free-space checks, retries, stall detection and notifications. For a single ~840 MB job, the configuration that matters is: `TransferHint.userInitiated` with a running notification (UIDT on Android 14+), `Config.runInForeground` for Android 7–13, `Config.useCacheDir: never`, `Config.checkAvailableSpace`, a longer iOS `resourceTimeout`, and `requiresWiFi` as a user option. iOS cancels background transfers when the user force-quits the app, so resume must be a first-class path.

### Cited findings
**background_downloader** — [pub.dev](https://pub.dev/packages/background_downloader) (v9.6.6, about 5 Nov 2026); docs on the `main` branch: [parameters.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/parameters.md), [lifecycle.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/lifecycle.md), [CONFIG.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/CONFIG.md), [transfers.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/transfers.md), [downloads.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/downloads.md)
- Native backends: iOS uses `URLSession`. Android uses a WorkManager `DownloadWorker` and a `UIDTJobService`. — [pub.dev](https://pub.dev/packages/background_downloader)
- Android WorkManager tasks are limited to 9 minutes. Priority below 5 counts as expedited, with a 2-minute limit. `TransferHint.largeFile` sets `allowPause: true` "to survive Android 9-minute execution timeouts via automatic pause/resume cycles". `TransferHint.userInitiated` sets `priority: 0` and `allowPause`. On Android 14+, priority 0 plus a notification uses UIDT, "removing the background execution time limit". This needs the `RUN_USER_INITIATED_JOBS` permission and the `UIDTJobService` declared in the manifest. On Android 14+ a UIDT job may be refused when the app is in the background, and the plugin then falls back to WorkManager. — [parameters.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/parameters.md)
- `(Config.runInForeground, …)` and `(Config.runInForegroundIfFileLargerThan, MB)` run the task as an Android foreground service. This "removes 9 minute timeout" and requires a `running` notification. On API 34+ it also needs `FOREGROUND_SERVICE_DATA_SYNC` and `SystemForegroundService` with `foregroundServiceType="dataSync"`. — [CONFIG.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/CONFIG.md)
- `(Config.checkAvailableSpace, minMegabytes)` fails a download "if less than `minMegabytes` space will be available after this download completes". `(Config.resourceTimeout, Duration)` sets the iOS time allowed for the whole transfer; the default is 4 hours according to pub.dev. `(Config.useCacheDir, …)` defaults to `whenAble`. The docs say: "If you find that your app fails to download large files or cannot resume from pause, set this to `Config.never`". — [CONFIG.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/CONFIG.md), [pub.dev](https://pub.dev/packages/background_downloader)
- Pause works "only for download GET requests, only if the `Task.allowPause` field is true, and only if the server supports pause/resume". `taskCanResume` reports whether the server "appears capable". If the OS deleted the partial temp file, resume "will either restart as a normal download, or fail". — [lifecycle.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/lifecycle.md)
- `requiresWiFi`: on Android 9+ it requires `TRANSPORT_WIFI` with internet; below API 28 it requires an unmetered network. On iOS it sets `allowsCellularAccess = false`, which still allows Wi-Fi hotspots. A global override `FileDownloader().requireWiFi(RequireWiFi.asSetByTask|forAllTasks|forNoTasks)` persists across restarts. When the setting changes, running iOS tasks "are canceled and restarted from scratch". `transfer.holdReasonNotifier` reports `waitingForWiFi` or `offline`, and `transfer.allowCellular()` overrides the hold. — [parameters.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/parameters.md), [lifecycle.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/lifecycle.md), [transfers.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/transfers.md)
- `retries` (1–10) uses exponential backoff: "Failed tasks that can resume will attempt to resume rather than restart from scratch." `stallTimeout` kicks or resumes a stalled transfer while the app is in the foreground. — [parameters.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/parameters.md), [transfers.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/transfers.md)
- `ParallelDownloadTask(urls: [...], chunks: n)` splits a download into chunk tasks, but "Parallel downloads do not support URIs or Android UIDT." — [downloads.md](https://github.com/781flyingdutchman/background_downloader/blob/main/doc/downloads.md)
- Progress is available through `progressNotifier`, `networkSpeedNotifier`, `timeRemainingNotifier` and the `updates` stream. Calling `FileDownloader().start(autoCleanDatabase: true)` at launch reconciles transfers that finished or were interrupted while the app was suspended or closed. If the user swipes the app away, "the OS may terminate background transfers without notification." — [pub.dev](https://pub.dev/packages/background_downloader)
- No checksum or hash validation is documented in the pages I read.

**Apple URLSession background sessions** (accessed)
- A background configuration hands transfers "to the system, which handles the transfers in a separate process", and they continue "even when the app itself is suspended or terminated". However: "If the user terminates the app from the multitasking screen, the system cancels all of the session's background transfers … the system does not automatically relaunch apps that were force quit by the user." Apple encourages setting `isDiscretionary` when "transferring large amounts of data". — [URLSessionConfiguration.background(withIdentifier:)](https://developer.apple.com/documentation/foundation/urlsessionconfiguration/background(withidentifier:))
- The downloaded file "will be available until your delegate method returns", so it must be moved to a permanent location. If a transfer is started while the app is in the background, `isDiscretionary` "is treated as being true". A rate limiter delays tasks started from the background, so Apple advises using "a small number of background sessions — ideally just one" and starting many tasks at once. — [Downloading files in the background](https://developer.apple.com/documentation/foundation/downloading-files-in-the-background)

**Android UIDT** (accessed)
- UIDT jobs need API 34, the `RUN_USER_INITIATED_JOBS` permission, `setUserInitiated(true)` and a notification set through `setNotification()`. They are "unaffected by App Standby Buckets quotas" and must be scheduled while the app is visible. Google recommends `setEstimatedNetworkBytes()`. The system can still stop a job when a constraint is no longer met, on thermal pressure, or on low memory, and the app must persist transfer state itself. A user pressing Stop in Task Manager kills the process without calling `onStopJob()`. There is "no Jetpack library that supports UIDT jobs", so below Android 14 the recommended fallback is WorkManager's foreground-service worker. The page links a Google Maps case study: "improved download reliability by 10%" with UIDT (Sept 2024). — [Android UIDT docs](https://developer.android.com/develop/background-work/background-tasks/uidt)

### Inferences
- Recommended setup for Nota (minSdk 24, iOS 16+): use one `DownloadTask` per file, or per part if split for Cloudflare caching, all enqueued together in one group (Apple's one-session advice). Use `TransferHint.userInitiated` plus `configureNotification(running:, progressBar: true)`. Set `Config.runInForeground` (or `runInForegroundIfFileLargerThan: 50`) for Android 7–13. Set `Config.useCacheDir` to `never`, `Config.checkAvailableSpace` to the remaining-file size plus headroom (for example 1.2 GB free before starting), and `Config.resourceTimeout` well above 4 hours (for example 24 hours) for slow links. Use `retries: 5–10` and `stallTimeout: 30–60 s`. Expose a "Wi-Fi only" toggle mapped to `requiresWiFi`, with an "Use mobile data anyway" button calling `allowCellular()`. Show the size (840 MB) and the estimated time before starting.
- Do not use `ParallelDownloadTask` for the main path, because it loses UIDT on Android 14+. If parallelism or smaller retry units are wanted, split the file on the server into parts and download them as separate normal tasks.
- On iOS, design for force-quit. On next launch, call `FileDownloader().start()`, check which files and parts already verify against the manifest, and re-enqueue only the missing ones. The app should also download without background mode, since the user is likely to keep it open on first launch.
- With the HF Hub as host, the signed CDN URL expiring after about an hour means any resume after a long pause must go back to the `/resolve/` URL. Whether background_downloader's resume (and iOS resume data) reuses the redirect target or the original URL was not documented, so this is a risk to test.

### Gaps
- I found no source documenting background_downloader's exact Range/ETag/If-Range behaviour when resuming. The docs only say "if the server supports pause/resume".
- I did not test iOS `resumeData` behaviour across redirects to expiring signed URLs.

## Integrity: SHA-256 manifests, signed manifests, atomic moves, partial and corrupt files

### Takeaway
Use the SHA-256 and byte count already in `models/manifest.json`. Download into a temporary `.part` file, check the size and then the SHA-256 after download (before first use), and only then rename it atomically into a versioned model directory. Delete a file whose size or hash does not match. Hugging Face and the CDNs already expose the material needed: strong ETags, `x-linked-size`, and a SHA-256 `x-linked-etag`. Signing the manifest guards against a compromised host; TLS alone guards only the transport.

### Cited findings
- Nota's existing manifest records `bytes` and `sha256` per file, for example `hohe-w8.onnx`: 723,419,839 bytes, `24df360e…2ced7f`; `punct-w8.onnx`: 117,182,179 bytes, `e9b8e72c…8082e3`. — local file `/Users/rz/rz-codes/amharic-stt/models/manifest.json`
- HF LFS pointers record `oid sha256:<hash>` and `size`. — [HF storage limits](https://huggingface.co/docs/hub/storage-limits). The `/resolve/` response exposes `x-linked-etag` (a 64-hex hash) and `x-linked-size`. — direct observation, [Hohe repo](https://huggingface.co/snapwre/hohe-asr-amharic)
- PocketPal's Android engine downloads into a `.part` file. On completion, `commit()` checks `part.length() == totalBytes`, deletes the part and fails with a size-mismatch error otherwise, then does `part.renameTo(file)`. — [PocketPal DownloadEngine.kt](https://github.com/a-ghorbani/pocketpal-ai/blob/main/android/app/src/main/java/com/pocketpalai/download/DownloadEngine.kt) (main branch, last commit 2026-11-06)
- PocketPal computes a SHA-256 of the model file after download (`getSHA256Hash(filePath)` → `model.hash`). — [PocketPal ModelStore.ts](https://github.com/a-ghorbani/pocketpal-ai/blob/main/src/store/ModelStore.ts)
- iOS deletes a background download's temporary file when the delegate returns, so it must be moved first. — [Apple: Downloading files in the background](https://developer.apple.com/documentation/foundation/downloading-files-in-the-background)
- background_downloader documents no built-in checksum. — [pub.dev](https://pub.dev/packages/background_downloader)

### Inferences
- Integrity pipeline:
  1. Fetch the small manifest first, from the same host or a separate stable URL.
  2. Download each file or part to `<appSupport>/models/staging/<version>/…`.
  3. Check the size, then the SHA-256. Hash in a background isolate with a streaming hash (for example `package:crypto` over chunked reads), because 723 MB takes noticeable time on low-end phones.
  4. If split into parts, join the parts and check the whole-file hash.
  5. Rename the staging directory to `models/<version>/`. A directory rename on the same filesystem is atomic.
  6. Write a small "current" pointer file (write to a temp file, then rename).
  7. Only then load it with ONNX Runtime.

  Keep a verified marker so the hash is not recomputed on every launch; check size and modification time instead.
- Signed manifest: embed a public key (for example Ed25519 or minisign) in the app and sign `manifest.json` in CI. The app then rejects a manifest or file swapped on R2, HF or GitHub. That matters because the app promises local-only processing and a malicious model could misbehave. This design is my own recommendation; no source in these notes covers it.
- Treat ONNX Runtime session creation failing on a hash-verified file as a compatibility error (wrong ORT or opset), not as corruption. That is a reason for the version mapping below.

### Gaps
- I found no open-source Flutter app showing signed-manifest verification for model files.
- I did not research TUF or Sigstore for mobile model delivery.

## Versioning and updates (manifest mapping, deltas, rollback, update frequency)

### Takeaway
Ship models on their own release track: a remote manifest lists model versions with a minimum app version (or a "model format" integer the app understands), file URLs, sizes and hashes. The app downloads a new version in the background, keeps the old one until the new one verifies and loads, then switches and deletes the old one. Byte-level deltas are probably not worth building for 8-bit ONNX weights after a retrain. Upstream Hohe weights have changed once since publication (Sept–Oct 2026 history), so updates will be rare and mostly driven by Nota's own export or quantisation changes.

### Cited findings
- The upstream Hohe repo has 8 commits, all between 2026-09-20 ("initial commit", "v1.0", "add the language model") and 2026-10-05 (model card and `lm/decoder.json` alpha/beta edits). Nota pins `217712df…`, which matches the current `x-repo-commit`. — [HF commits API, snapwre/hohe-asr-amharic](https://huggingface.co/api/models/snapwre/hohe-asr-amharic/commits/main); local `scripts/build_speech_models.py` line 35
- Nota's ONNX artefacts also depend on the build toolchain (`torch 2.8.0`, `transformers 5.15.1`, `onnxruntime 1.31.0` recorded in `built_with`). — local `models/manifest.json`
- HF Xet storage splits files into content-defined chunks of about 64 KB. "only changed chunks" are uploaded, and HF's blog says downloads benefit the same way. The reported deduplication ratios of 30–85% come from early research. — [HF Xet docs](https://huggingface.co/docs/hub/xet), [HF blog "From Files to Chunks"](https://huggingface.co/blog/from-files-to-chunks) (2024), [Xet on the Hub](https://huggingface.co/blog/xet-on-the-hub) (Mar 2025)
- Pinning a commit gives immutable content: HF `/resolve/<revision>/<file>` URLs carry `x-repo-commit`. — direct observation (see above)

### Inferences
- Manifest shape (suggested):
  ```json
  {
    "schema": 1,
    "models": [
      {
        "id": "hohe-w8",
        "version": "2026.11.0",
        "format": 1,
        "minApp": "0.3.0",
        "files": [
          {
            "name": "hohe-w8.onnx",
            "bytes": 723419839,
            "sha256": "…",
            "urls": ["https://models.nota…/…", "https://huggingface.co/<org>/<repo>/resolve/<commit>/…"]
          }
        ]
      }
    ],
    "sig": "…"
  }
  ```
  The app picks the newest entry whose `format` it supports and whose `minApp` is at or below its own version. Add a `maxApp` or `deprecated` field to retire a broken model. To roll back, republish the old version as current; old files stay on the host, which is cheap because storage is pennies.
- Keep two slots on the device, current and staging. Delete the old version only after the new one has verified its hash, loaded in ONNX Runtime, and passed a tiny smoke test (for example transcribing a bundled one-second WAV to a known string, reusing the `electron/speech/fixtures/` idea). On failure, keep the old version and report the error. This needs free space for about two models (1.7 GB) during an update, so check `checkAvailableSpace` first. If space is short, offer "replace in place" with a re-download fallback.
- Deltas: after a retrain or re-quantisation, almost every int8 weight and scale changes, so bsdiff-style patches would save little and cost CPU and memory on the phone. Deltas only pay off for metadata-only changes, which are tiny JSON files anyway. Updating the small JSON files (hohe.json, punct.json) separately from the ONNX weights is cheap. The punctuation model (117 MB) and Hohe (723 MB) can be versioned independently, so a punctuation update does not trigger an 840 MB download. Hosting on the HF Hub with Xet could reduce update bytes for unchanged chunks, but only when the client speaks the Xet protocol. A plain HTTP Range download through background_downloader would fetch the whole file.
- Updating without an app release is possible as long as the ONNX input/output contract (`format`) stays the same. Any change that needs new Dart pre- or post-processing must raise `format` and `minApp`.
- Update prompts: for users on mobile data in Ethiopia, model updates should never auto-download on cellular. Default to Wi-Fi-only for updates, ask for the first download, and show the size.

### Gaps
- I found no measured study of delta sizes between quantised ONNX model versions.
- Whether the Dart or Flutter ecosystem has a Xet-protocol client was not checked.

## Real-world implementations to copy

### Takeaway
PocketPal (a mature on-device LLM app) downloads models from Hugging Face. On Android it uses a hand-written native engine (OkHttp Range plus `If-Range` with a strong ETag, a `.part` file, a size check, rename, UIDT on 14+, WorkManager fallback, and a Room DB of download state). On iOS it uses a background `downloadFile`. It checks free space first and hashes the result. sherpa-onnx distributes models through GitHub Releases, and its Flutter examples bundle models as assets copied to a writable directory.

### Cited findings
**PocketPal** — [a-ghorbani/pocketpal-ai](https://github.com/a-ghorbani/pocketpal-ai) (last commit 2026-11-06)
- `DownloadEngine.kt` sends `Range: bytes=<offset>-` and `If-Range: <etag>`, keeping only strong ETags (`ETag` not starting with `W/`). On `206` it checks the `Content-Range` start and the ETag, restarting otherwise. On `416` it checks whether the file is already complete. It treats `408`, `429` and `5xx` as transient, with exponential backoff and a give-up timer when no bytes arrive. It adopts an in-place partial file and fails on any size mismatch at commit. — [DownloadEngine.kt](https://github.com/a-ghorbani/pocketpal-ai/blob/main/android/app/src/main/java/com/pocketpalai/download/DownloadEngine.kt)
- `DownloadScheduler.kt` on API 34+ schedules a JobScheduler job with `setUserInitiated(true)`, `NETWORK_TYPE_ANY` and exponential backoff (30 s). Otherwise it uses WorkManager `enqueueUniqueWork` with `NetworkType.CONNECTED`. The source tree also has `DownloadDatabase`, `DownloadDao` and `DownloadEntity` (persisted state) and `DownloadNotifications`. — [download/ folder](https://github.com/a-ghorbani/pocketpal-ai/tree/main/android/app/src/main/java/com/pocketpalai/download)
- `DownloadManager.ts` sends the HF auth token only to Hugging Face URLs ("Only send the HF auth token to huggingface.co") and calls `hasEnoughSpace(model)` before starting. On iOS it uses `RNFS.downloadFile({ background: uiStore.iOSBackgroundDownloading, discretionary: false, … })`. — [DownloadManager.ts](https://github.com/a-ghorbani/pocketpal-ai/blob/main/src/services/downloads/DownloadManager.ts)
- `ModelStore.ts` computes `getSHA256Hash(filePath)` after download. — [ModelStore.ts](https://github.com/a-ghorbani/pocketpal-ai/blob/main/src/store/ModelStore.ts)

**sherpa-onnx (k2-fsa)**
- The Flutter examples README says model files "must be bundled as Flutter assets and copied to a writable directory", using a `copyAsset()` helper with `rootBundle.load`. — [flutter-examples/README.md](https://github.com/k2-fsa/sherpa-onnx/blob/master/flutter-examples/README.md)
- The repository references `releases/download/asr-models` in 555 files: its pre-trained models are distributed as GitHub Release assets under an `asr-models` tag. — GitHub code search on [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)

**WhisperKit (Argmax)**
- The source tree vendors a Hugging Face Hub client (`Sources/ArgmaxCore/External/Hub/…`), which suggests models are fetched from the HF Hub at runtime. I did not read the default repo id or the download code. — [argmaxinc/WhisperKit](https://github.com/argmaxinc/WhisperKit)

### Inferences
- Patterns worth copying into Nota's Dart code, through background_downloader or a small native layer:
  - Persist a download record per file (URL, ETag, total bytes, bytes done, manifest version).
  - Resume with `Range` plus `If-Range` and a strong ETag; restart on a mismatch, and finish on `416` when the size matches.
  - Treat 408, 429 and 5xx as retryable with backoff.
  - Use a `.part` file, then size check, SHA-256 and rename.
  - Use UIDT on Android 14+ with a foreground-worker fallback.
  - Check free space before starting.
  - Never send credentials to non-HF hosts.
- sherpa-onnx's two approaches (bundling and GitHub Releases) show the trade-off. Bundling 840 MB is not viable for a store download on cellular, while GitHub Releases is the common free host in open-source speech projects.
- background_downloader already covers most of PocketPal's Android engine, so a custom native engine is only worth writing if testing shows resume failures through redirects or slow links.

### Gaps
- I did not inspect whisper.cpp's example apps, Vosk's Android or iOS apps, or other Flutter speech apps (for example ones built on sherpa-onnx with downloads) for their download code. vosk-android-demo's README only points to the Vosk website.
- I did not verify how PocketPal's iOS path handles force-quit and resume.
