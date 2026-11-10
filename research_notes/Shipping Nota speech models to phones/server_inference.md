# Serving Hohe from a server (REST / WebSockets) instead of on the phone

Scope: what it would take to run Nota's Amharic speech model (Hohe, wav2vec2-BERT CTC, ~600M parameters; 8-bit ONNX file 723 MB, plus a 117 MB punctuation model) on a server that the Flutter app calls, compared with running it on the phone. Research date: 6 November 2026. "Accessed" means the page was read on that date; where a page carries its own date it is given.

---

## 1. What does hosting cost (CPU vs GPU, serverless GPU), per audio hour and at 1,000 / 10,000 / 100,000 users?

### Takeaway
Raw compute is cheap: on these list prices, one hour of Amharic audio costs a few US cents on a CPU instance and about 1–2 cents on a small GPU, if the machine is kept busy. The real cost is idle capacity. A service that answers without cold starts needs at least one machine on all the time, about $100–600 a month before the first user. At 100,000 users the bill lands somewhere between a few thousand and a few tens of thousands of dollars a month, depending on how much people dictate. On-device inference costs the developer nothing per use.

### Cited Findings
- **Nota's own speed measurements (repo, not web):** 8-bit ONNX Hohe on a Mac **CPU** ran at **4.3× real time** (8-bit weights and activations: 8.9×; 4-bit weights: 4.8×). PyTorch float32 on the **Mac GPU** ran at **27.9×** (float16: 30.1×). The doc warns the machine was busy (load average 17–38 on 10 cores), so these speeds are approximate. — `/Users/rz/rz-codes/amharic-stt/docs/embedded-speech.md` (section "Accuracy against human transcripts (FLEURS)")
- **Hugging Face Inference Endpoints** (pricing doc, undated, accessed 6 Nov 2026). CPU (Intel Sapphire Rapids) on AWS: x1 (1 vCPU, 2 GB) $0.033/h, x2 $0.067/h, x4 (4 vCPU, 8 GB) $0.134/h, x8 (8 vCPU, 16 GB) $0.268/h. On GCP the same sizes cost $0.050–0.400/h. GPUs on AWS: T4 $0.50/h, L4 $0.80/h, A10G $1.00/h. On GCP: T4 $0.50/h, L4 $0.70/h. Billing is per minute while an endpoint is initializing or running. The page's own example uses $0.064/h for x2, not the table's $0.067, so the doc contradicts itself slightly. — [Hugging Face Inference Endpoints pricing](https://huggingface.co/docs/inference-endpoints/pricing)
- **RunPod** (pricing page "Updated November 4, 2026"). Serverless: 16 GB GPUs (A4000/A4500/RTX 4000/RTX 2000) $0.58/h; 24 GB (L4/A5000/3090) $0.75/h; RTX 4090 $1.34/h. On-demand pods: L4 $0.59/h Secure Cloud, $0.44/h Community Cloud; RTX 4090 $0.89/h Secure, $0.34/h Community. The page lists no CPU serverless. — [RunPod pricing](https://www.runpod.io/pricing)
- **Modal** (secondary only: modal.com/pricing could not be fetched). Aggregators give T4 $0.000164/s (~$0.59/h), L4 $0.000222/s (~$0.80/h), A10/A10G $0.000306/s (~$1.10/h), with per-second billing. Other blogs give different, higher figures. — [pricegpu.pages.dev (Modal)](https://pricegpu.pages.dev/provider/modal); conflicting figures in [theneuralbase.com](https://theneuralbase.com/modal/learn/beginner/gpu-l4-for-cheaper/). **These rest on secondary sources only.**
- **Cloudflare Workers AI** (pricing page "Last updated Oct 20, 2026"): $0.011 per 1,000 Neurons, with 10,000 Neurons a day free. Speech models per audio minute: `@cf/openai/whisper` and `whisper-large-v3-turbo` $0.0005 (≈$0.03 per audio hour); Deepgram `nova-3` $0.0052 (≈$0.31/h); Nova-3 over WebSocket $0.0092; `flux` over WebSocket $0.0077. The pricing page lists only Cloudflare's catalog models and says nothing about uploading your own weights. — [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- Stock Whisper cannot transcribe Amharic usefully (the project measured ~193% CER), so Workers AI's cheap Whisper is not a substitute for Hohe. — `/Users/rz/rz-codes/amharic-stt/CLAUDE.md` ("Hard-won constraints"); internal measurement, not a web source.

### Inferences
- **Cost per audio hour at full use** (my arithmetic from the figures above; the speed on server hardware is an assumption):
  - CPU: assume an 8-vCPU x86 instance runs 8-bit Hohe at about the Mac CPU's 4× real time. Then $0.268/h ÷ 4 ≈ **$0.07 per audio hour**, or ≈ $0.03 with the 8.9× activation-quantised file. This is uncertain: one vCPU is a hyperthread, and an Apple-silicon core is usually faster.
  - GPU: assume an L4 runs Hohe at ≥50× real time with batching. The Mac GPU alone did 27.9× unbatched, and I found no published wav2vec2-BERT benchmark on an L4. Then $0.80/h ÷ 50 ≈ **$0.016 per audio hour**.
  - Punctuation (XLM-R, 117 MB) adds little next to the acoustic model.
- **The always-on floor** (730 h a month): one x4 CPU endpoint ≈ $98/month; one x8 ≈ $196; one L4 ≈ $430–584 (RunPod pod to HF). Scale-to-zero serverless removes the floor. In exchange, the first request after an idle period waits for a container to start and a 723 MB model to load: a cold start of many seconds, which I could not source with a figure. That is bad for dictation.
- **Scenario table** (assumptions: Ethiopian users are awake in one time zone, so peak load is ~3× the average and capacity runs ~33% busy; "light" = 30 min of audio per user per month, "heavy" = 5 h):

  | Users | Audio h/month (light / heavy) | CPU, x8 at ~$0.07/h of audio, ÷0.33 use | GPU, L4 at ~$0.016/h of audio, ÷0.33 use |
  |---|---|---|---|
  | 1,000 | 500 / 5,000 | ~$100–200 (the floor dominates) / ~$1,050 | ~$430–584 (floor) / floor |
  | 10,000 | 5,000 / 50,000 | ~$1,050 / ~$10,500 | floor (~$500) / ~$2,400 |
  | 100,000 | 50,000 / 500,000 | ~$10,500 / ~$105,000 | ~$2,400 / ~$24,000 |

  Add a second instance in every row for redundancy, plus load balancing, logging and egress, which are small next to compute. Ingress, i.e. audio uploads, is usually free on clouds, but I did not verify that.
- Against that, the one-time 840 MB model download costs the developer only CDN or object-storage egress. That is covered by another research thread and not priced here.

### Gaps
- I found no published throughput for wav2vec2-BERT (600M) or Hohe on T4, L4 or x86 CPUs. The GPU speeds above are assumptions. A one-day benchmark on an HF endpoint or a RunPod pod would replace them.
- I could not fetch Modal's or Replicate's official pricing pages, so the Modal figures are secondary and Replicate is not covered.
- I have no source for cold-start times on any serverless GPU platform loading a ~720 MB ONNX model.
- I have no data on how many minutes Nota users actually record. The light and heavy usage levels are placeholders.

---

## 2. REST (upload a file) vs WebSocket (streaming), for dictation and for whole recordings; what open-source servers exist?

### Takeaway
Hohe is a full-context CTC model, not a streaming one, and Nota already cuts dictation into clips at 0.5 s pauses. A plain REST call per clip, or per 20 s piece of a recording, matches how the model works. A WebSocket mainly saves connection setup and lets the server push results back. It does not make Hohe stream. sherpa-onnx ships ready-made streaming and non-streaming WebSocket servers, but Hohe's SeamlessM4T feature front end is custom, so the server would need Nota's own preprocessing either way.

### Cited Findings
- Nota's dictation already works per clip: `speech-segmenter.ts` cuts clips at 0.5 s pauses and each clip goes through `transcribeClip`. The phone runs Hohe in 20 s pieces. — `/Users/rz/rz-codes/amharic-stt/CLAUDE.md` (repo).
- sherpa-onnx has a C++ **streaming** server (`sherpa-onnx-online-websocket-server`) for real-time recognition, which serves several clients at once, and a **non-streaming** one (`sherpa-onnx-offline-websocket-server`) for pre-recorded audio. Python equivalents (`non_streaming_server.py`) cover transducer, Paraformer, NeMo CTC and Whisper models. — [sherpa-onnx streaming WebSocket server](https://k2-fsa.github.io/sherpa/onnx/websocket/online-websocket.html); [non-streaming WebSocket server](https://k2-fsa.github.io/sherpa/onnx/websocket/offline-websocket.html); [Python non-streaming server](https://k2-fsa.github.io/sherpa/onnx/python/non-streaming-websocket-server.html)
- Commercial pricing shows the streaming premium. Cloudflare charges $0.0052/min for Deepgram Nova-3 on uploaded audio and $0.0092/min for the same model over WebSocket. — [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) (Oct 20, 2026)
- Nota ported Hohe's preprocessing (SeamlessM4T log-mel features), CTC decoding, splitting at pauses and the punctuation path to TypeScript and Dart, and checks them against Python fixtures. — `/Users/rz/rz-codes/amharic-stt/CLAUDE.md` (repo).

### Inferences
- **Whole recordings:** REST upload (Opus-compressed, see Q4), with the server splitting into ≤20–30 s pieces and batching them on a GPU, is the simplest design. A resumable upload, i.e. chunked and retried, matters more than the protocol on flaky 3G/4G.
- **Dictation:** each pause-delimited clip is a few seconds. A POST per clip over a kept-alive HTTP/2 connection adds about one network round trip plus inference per clip. A WebSocket saves the per-request headers and lets the server answer out of order. Neither gives word-by-word partial results, because Hohe needs the whole clip.
- **Server software:** sherpa-onnx's servers expect model families it already supports (its docs list transducer, Paraformer, NeMo CTC and Whisper). Hohe would most likely need a small custom server: Nota's feature extraction plus ONNX Runtime plus CTC plus punctuation, e.g. a Python/FastAPI or Node service reusing `electron/speech/`. The other route is Triton's ONNX Runtime backend with preprocessing in front of it.

### Gaps
- I did not verify whether sherpa-onnx can load a wav2vec2-BERT CTC model with SeamlessM4T features without code changes. Its docs pages list other families.
- NVIDIA Triton (ONNX Runtime backend, dynamic batching) and streaming wrappers such as WhisperLive were not researched within the tool budget.

---

## 3. Latency from Ethiopia: nearest cloud regions, round-trip times, mobile network quality

### Takeaway
No hyperscaler GPU region exists in Ethiopia that I could confirm. Cloudflare does have a point of presence in Addis Ababa, but its speech models cannot run Hohe. Ethio Telecom reports fast 4G growth, about 82% population coverage by mid-2026 in press reports. Round trips to the nearest cloud regions are likely around 100 ms or more. For clip-by-clip dictation that is tolerable, but each request depends on a working connection.

### Cited Findings
- Cloudflare lists an **Addis Ababa (ADD)** point of presence as operational. — [Cloudflare System Status](https://www.cloudflarestatus.com/); [openstatus Cloudflare ADD](https://www.openstatus.dev/status/cloudflare-workers/addis-ababa-ethiopia-add)
- Before regional PoPs, Cloudflare said East African traffic was largely served from London and Amsterdam with **150–350 ms** round trips. This is an older post (Mombasa launch, probably 2015–2016), so the figure has very likely changed. — [Cloudflare blog, Mombasa](https://blog.cloudflare.com:8443/mombasa-kenya-cloudflares-43rd-data-center)
- AFPIF 2022 (Josiah Chavula): across Africa, the median latency from RIPE probes to the **AWS Africa region was 84 ms**, against **45 ms** to CDN nodes. **Dated August 2022, older than 2024.** — [AFPIF 2022, Cloud Latency in Africa (PDF)](https://www.afpif.org/wp-content/uploads/2022/09/2-Cloud-Latency-in-Africa-JosiahChavula-Kigali-August2022.pdf)
- Addis Ababa has **4 data centres from 3 colocation providers** (Safaricom, Raxio, Wingu.Africa) per a colocation directory. — [ocolo.io Addis Ababa](https://www.ocolo.io/data-centers/ethiopia/addis-ababa/) (secondary, undated)
- **Ethio Telecom (press reports; figures conflict):** for 2025/26, 90.12 million customers, 72.09 million active mobile subscribers, 51.53 million mobile data users, and **4G population coverage of 82.23%**, with a 2026/27 target of 95%. The reported FY2024/25 change was 37.5% to 70.8%. A mid-year report gives 1,069 4G towns covering 74% of the population. — [TechAfrica News, July 2026](https://techafricanews.com/2026/07/23/ethio-telecom-reports-record-revenue-growth-tops-90-million-customers/); [Telecom Review Africa, H1 2025/26](https://www.telecomreviewafrica.com/articles/telecom-operators/28197-ethio-telecom-accelerates-ethiopias-digital-future-with-h1-2025-26-achievements/). **These are secondary sources. I did not see the operator's own report.**
- Ethio Telecom and ZTE deployed 152 rural base stations (Nov 2025). — [MEA Tech Watch](https://meatechwatch.com/2025/11/26/ethio-telecom-and-zte-deploy-152-rural-base-stations-to-expand-mobile-coverage-across-ethiopia/)
- The last operator-level Ookla figures I found are from **Q1 2023** (older than 2024): Safaricom Ethiopia's median download was 32.81 Mbps, Ethio Telecom's 13.76 Mbps. DataReportal (citing Ookla) puts Ethiopia's median **fixed** download at 9.37 Mbps at the end of 2025. — [Addis Fortune](https://addisfortune.news/safaricom-takes-lead-in-median-speed-performance-speed-test-report); [DataReportal, Digital 2026: Ethiopia](https://datareportal.com/reports/digital-2026-ethiopia)

### Inferences
- With upload speeds of a few Mbit/s, a 5 s dictation clip in Opus (≈10 KB) uploads in well under 100 ms. Latency per clip would be dominated by the round trip (≈100–300 ms to South Africa, the Gulf or Europe) plus queueing and inference. That is acceptable, and comparable to or faster than on-phone inference on a low-end phone.
- Hosting inside Ethiopia, which data-localisation rules may require (Q6), means colocation in Addis (Safaricom, Raxio or Wingu). No GPU cloud is available there that I could confirm, so the operator would need its own hardware.

### Gaps
- **Unverified (general knowledge, not sourced here):** the nearest hyperscaler regions are believed to be AWS af-south-1 (Cape Town) and Middle East regions (Bahrain, UAE), Azure South Africa North and UAE North, and GCP africa-south1 (Johannesburg) and Doha. I did not confirm them from provider pages within the tool budget, nor whether any provider has opened an East African region by November 2026.
- I found **no measured RTT from Addis Ababa** to any cloud region, and no 2025–2026 Ookla mobile median latency for Ethiopia (speedtest.net could not be fetched). RIPE Atlas probes in Ethiopia or a test from a local phone would answer this.
- I did not find coverage or speed data for 3G-only areas or rural Ethiopia.

---

## 4. Data use and price: audio upload per hour vs a one-time 840 MB model download

### Takeaway
Opus at 16–20 kbit/s uses about 7–9 MB per hour of speech. At that rate, a user must transcribe roughly 90–120 hours before uploads cost more data than the one-time 840 MB download. Uncompressed 16 kHz WAV (115 MB/h) crosses that line after about 7 hours. In Ethiopia, 840 MB costs roughly 40–50 birr (about $0.30) at late-2025 bundle prices. Prices rose sharply in December 2025 and the birr has weakened.

### Cited Findings
- Opus bitrate "sweet spots" (20 ms frames): **8–12 kbit/s for narrowband speech, 16–20 kbit/s for wideband speech**, 28–40 kbit/s for fullband speech. (RFC 6716 §2.1.1, Sept 2012. Older than 2024, but a stable codec standard.) — [RFC 6716](https://www.rfc-editor.org/rfc/rfc6716)
- Nota records 16 kHz mono PCM, i.e. wideband. — `/Users/rz/rz-codes/amharic-stt/CLAUDE.md` (repo: "streams 16 kHz samples").
- **Safaricom Ethiopia raised data prices by 20–82%** (article 24 Dec 2025, effective 14 Tahsas 2018 E.C.): the 10 GB weekly bundle that cost 250 birr now gives 5.5 GB; 100 birr weekly went from 3 GB to about 2 GB; unlimited bundles rose 20–25% (quarterly unlimited 4,250 birr, semi-annual 8,500 birr). — [Addis Insight, 24 Dec 2025](https://addisinsight.net/2025/12/24/safaricom-ethiopia-raises-data-package-prices-by-up-to-82/)
- Ethio Telecom also announced a "moderate price adjustment", with consumer-protection measures, in late 2025. The birr reportedly passed 150 per US dollar by mid-November 2025. — [IT News Africa, Dec 2025](https://www.itnewsafrica.com/fr/2025/12/ethiopia-telecom-data-prices-under-scrutiny-as-operators-adjust-tariffs/) (secondary; the Addis Insight article's figures imply ~120 birr/USD, a conflict).
- Ethio Telecom price lists found in search are **undated and conflict**: monthly 1 GB at 50 or 60 birr, 10 GB at 379 or 455 birr. ethiotelecom.et refused the connection, so I could not check the current tariff. — [awajis.com, Ethio Telecom data plan](https://awajis.com/ethio-telecom-data-plan/) (secondary)
- Google's Android docs warn that the platform `SpeechRecognizer` "is likely to stream audio to remote servers" and "is not intended to be used for continuous recognition, which would consume a significant amount of battery and bandwidth". — [Android SpeechRecognizer reference](https://developer.android.com/reference/android/speech/SpeechRecognizer)

### Inferences
- Data per hour of audio (arithmetic): WAV 16 kHz × 16-bit mono = 256 kbit/s = **115.2 MB/h**. Opus 16 kbit/s = **7.2 MB/h**; Opus 20 kbit/s = 9 MB/h; Opus 12 kbit/s (narrowband) = 5.4 MB/h. WebSocket/TLS framing adds a few percent.
- Break-even against the 840 MB model: about **117 h** of Opus at 16 kbit/s, **93 h** at 20 kbit/s, and **7.3 h** of WAV. A heavy user (5 h/month) on Opus reaches it after about 1.5–2 years. A light user (30 min/month) never does. So a server design saves most users data only if audio is compressed. Uploading WAV would cost a regular user more data within a couple of months.
- Price to the user (using Safaricom's post-rise ~45 birr/GB, or Ethio Telecom's 38–60 birr/GB from the undated lists): the 840 MB download ≈ **38–50 birr (~$0.25–0.40)** once. An hour of Opus upload ≈ 0.3–0.4 birr; an hour of WAV ≈ 5–7 birr.
- What weighs against the one-time download is the **upfront** 840 MB on a metered connection and storage use, not its lifetime total. Model updates (another 723 MB each time Hohe changes) count against the on-device design.

### Gaps
- I could not reach a 2025–2026 cable.co.uk / broadband.co.uk figure for Ethiopia's average price per GB. The newest cable.co.uk survey in results was 2022. The 2026 league table exists at [broadband.co.uk](https://www.broadband.co.uk/mobile-data-price-league) but was not fetched.
- Ethio Telecom's current official prices were not verifiable: the site refused the connection.
- I did not test how accurate Hohe is on Opus-compressed audio. Low-bitrate codecs can raise CER, which an ASR server design would need to check.

---

## 5. Reliability: internet shutdowns and regional disruptions in Ethiopia

### Takeaway
Ethiopia shuts down the internet often and by region, and some shutdowns are long. Tigray was cut off for about two years (2020–2022). Mobile data in Amhara was cut from August 2023 and only partly restored. In late September 2026, NetBlocks detected a new subnational disruption in northern Ethiopia as war resumed with Tigrayan forces. An app that needs the network to transcribe would stop working for exactly the users in these regions, sometimes for months.

### Cited Findings
- **25 September 2026 (Reuters via TimesLive):** NetBlocks reported "a subnational internet disruption in northern Ethiopia", matching reports of a telecoms blackout in Tigray. War broke out that week between the federal military and Tigrayan forces and their allies. Tigrayan forces seized three local airports and attacked neighbouring Afar and Amhara. Reuters called it the most serious escalation since the 2020–2022 war. — [TimesLive, 25 Sep 2026](https://www.timeslive.co.za/news/africa/2026-09-25-internet-disruption-detected-in-war-hit-northern-ethiopia-web-monitor-says/)
- **Amhara:** mobile and fixed internet were cut on 3 August 2023 after fighting with Fano escalated. Data service was later restored in 19 cities, and residents reported slow, inconsistent connections afterwards. — [Access Now, Amhara](https://www.accessnow.org/press-release/amhara-internet-shutdown/); [Internet Society Pulse](https://pulse.internetsociety.org/shutdowns/internet-shutdown-in-amhara-region-ethiopia-august-2023); [Eastleigh Voice, restoration after 11 months](https://eastleighvoice.co.ke/Fano%20militia/58836/internet-services-restored-in-ethiopias-amhara-region-after-11-month-blackout)
- **Tigray 2020–2022:** Access Now called it "the world's longest uninterrupted shutdown". — [Access Now, Tigray](https://www.accessnow.org/tigray-internet-shutdowns/)
- **Cost:** a study funded by Access Now estimated Ethiopia lost $1.59 billion to shutdowns totalling 14,910 hours and affecting 29 million users. The date of the study is not clear from the snippet. — [Access Now, Ethiopia region page](https://www.accessnow.org/region/ethiopia/)
- Access Now has counted at least 26 shutdowns in Ethiopia since 2016. This is from an older release and may be out of date. — [Access Now, Ethiopia](https://www.accessnow.org/region/ethiopia/)
- Access Now's 2025 #KeepItOn report ("When repression meets resistance", 31 March 2026) exists, but I could not open it for Ethiopia's 2025 figures. — [Access Now, Ethiopia region page](https://www.accessnow.org/region/ethiopia/)

### Inferences
- A server-only design would make speech features fail during every shutdown. These are regional and long, and they fall in Amhara and Tigray, where Amharic and Tigrinya speakers live. Amhara is a core Amharic-speaking region.
- Even a hybrid design needs on-device inference to be the default. Otherwise, a user who installs during a shutdown, or whose region is cut off later, loses dictation. Queuing recordings for later upload is a weaker fallback: transcripts would arrive days or months late.
- Shutdowns also block the one-time model download. That argues for letting users take the model from another phone or a computer (the current sideloading paths), or from a local share, and not dropping those paths.

### Gaps
- I have no 2025–2026 count of Ethiopian shutdowns or their durations: the KeepItOn 2025 report was not readable, and no NetBlocks primary post was fetched.
- I don't know whether the September 2026 Tigray disruption has ended, or whether it spread to Afar or Amhara.

---

## 6. Privacy and compliance: the "notes stay on this phone" promise, App Store / Play disclosures, Ethiopia's PDPP

### Takeaway
Sending voice to a server ends the "notes stay on this phone" promise for anything transcribed. It triggers Audio Data / "Voice or sound recordings" disclosures in both stores. Apple's definition exempts only real-time processing that is not retained; Google treats any transmission off the device as collection. Under Ethiopia's Personal Data Protection Proclamation No. 1321/2024, an Ethiopian operator would have to register with the Authority. Personal data collected in Ethiopia must be stored on servers in Ethiopia, and sending sensitive data abroad needs the Authority's prior approval. Together these rules push a server design toward in-country hosting.

### Cited Findings
- **Apple:** "'Collect' refers to transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time." Also: "Data that is processed only on device is not 'collected' and does not need to be disclosed." Audio Data is defined as "The user's voice or sound recordings." Optional-disclosure exemptions apply only when all criteria are met, including that collection is "not part of your app's primary functionality". — [Apple, App privacy details](https://developer.apple.com/app-store/app-privacy-details/) (accessed 6 Nov 2026)
- **Google Play Data safety:** Audio → "Voice or sound recordings" is defined as "A user's voice such as a voicemail or a sound recording." Data "only processed locally on the user's device and not sent off device" need not be disclosed as collected. Processing "ephemerally" means "accessing and using it while the data is only stored in memory". Transfers to a service provider that "processes it on behalf of the developer" are not "sharing". Developers "should follow best industry standards to safely encrypt your app's data in transit." — [Google Play Console Help, Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) (accessed 6 Nov 2026)
- **Apple's own server speech recognition** tells developers: "Do not perform speech recognition on private or sensitive information" and "Don't send passwords, health or financial data, and other sensitive speech for recognition." — [Apple, SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
- **Ethiopia PDPP No. 1321/2024** (unofficial English text on metaappz.com; check against the Negarit Gazeta):
  - Art. 22(1): controllers and processors must store locally collected personal data on a server or data centre located in Ethiopia.
  - Art. 22(2): the Authority will designate "critical personal data" that "shall only be processed in a server or data center located in Ethiopia".
  - Art. 22(3): "Cross-border transfer of sensitive personal data shall require the prior approval of the Authority."
  - Art. 19(5): transfers to jurisdictions without appropriate protection are prohibited. Art. 20(1) lists the routes that are allowed: an adequacy determination, explicit consent after the person is warned of the risks, necessity, and public registers.
  - Art. 2(5): sensitive data includes "Genetic or biometric data" and "Communications data, including content and metadata". Art. 2(6) defines biometric data by example (face, fingerprint, iris). **Voice is not named.**
  - Art. 9(2)(a): processing sensitive data on consent requires "written consent, specific to the purpose".
  - Art. 33(1): controllers and processors must be registered with the Authority before processing. Art. 35(2): registration is valid for two years.
  - Art. 3(2)(b): controllers not established in Ethiopia are covered only if they use equipment in Ethiopia for processing and have a representative established there.
  — [Proclamation 1321/2024, English text (metaappz)](https://www.metaappz.com/References/ethiopian_laws/federal/pr_1321_2024/en/txt)
- The Proclamation came into force on 24 July 2024 (secondary). — [Digital Policy Alert](https://digitalpolicyalert.org/change/12098-data-transfer-regulation-in-personal-data-protection-proclamation-proclamation-no-13212024); commentary at [TechHive Advisory](https://www.techhiveadvisory.africa/insights/review-of-ethiopias-data-protection-act) and [CIPIT](https://cipit.strathmore.edu/?p=4868)

### Inferences
- **The promise:** any server transcription means the voice note leaves the phone. The promise would have to become something like "notes stay on this phone; audio you choose to transcribe online is sent to our server and deleted after transcription." It could stay true only if server use were strictly opt-in and clearly marked.
- **Store labels:** under Apple's definition, a server that transcribes in memory and discards the audio and the text at once arguably does not "collect" Audio Data. Any logging, queueing for retry, or storage of the uploaded recording beyond the request would. Google's form treats sending data off the device as collection, with the ephemeral question as an additional answer. So Nota's Play listing would most likely gain "Audio: Voice or sound recordings, collected, processed ephemerally, encrypted in transit, required/optional." It would also likely gain user content (the returned transcript) and possibly app activity or diagnostics if the server logs requests.
- **PDPP:** voice notes are user content that may contain sensitive data (health, religion, politics), and voice can serve as biometric data. A server outside Ethiopia run by an Ethiopian developer would face Art. 22(1) local storage, Art. 22(3) prior approval for sensitive data, and Art. 33 registration. Purely transient processing might be argued to fall outside "storage", but that is a legal question the text does not settle. A developer with no Ethiopian establishment or equipment may fall outside Art. 3(2)(b), but a Nota publisher in Ethiopia would not. **Not legal advice; needs an Ethiopian lawyer.**
- On-device inference avoids all of this: nothing is collected, there is no cross-border transfer, and no processing happens on the developer's side.

### Gaps
- The Ethiopian Communications Authority's implementing directives (registration fees, the "critical personal data" list, guidance on whether voice counts as biometric) were not found.
- I did not confirm whether Google's Data safety form lets ephemerally processed audio be left off entirely. I believe it does not, but the help page text I retrieved did not settle it.
- I found no enforcement actions under the PDPP so far.

---

## 7. Hybrid designs: server as a fallback for low-end phones, or only while the model downloads; do apps do this?

### Takeaway
The phone platforms themselves use hybrids. Android's and Apple's built-in recognizers default to servers and offer an on-device mode plus model downloads on demand. Gboard reportedly uses the cloud when online and a small local model offline. For Nota, the realistic hybrid is the reverse: on-device by default, with an opt-in server path that covers the minutes while the 840 MB model downloads, or phones too weak to run Hohe. It carries the privacy, cost and shutdown caveats above.

### Cited Findings
- **Android:** the platform `SpeechRecognizer` "is likely to stream audio to remote servers". `createOnDeviceSpeechRecognizer` (API 31) forces local recognition and throws if `isOnDeviceRecognitionAvailable` is false. `triggerModelDownload` (API 33/34) "Attempts to download the support for the given recognizerIntent", "might trigger user interaction to approve the download", and reports progress or "onScheduled" through `ModelDownloadListener`. Error codes include `ERROR_LANGUAGE_UNAVAILABLE` ("supported, but not available currently (e.g. not downloaded yet)"). — [Android SpeechRecognizer reference](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- **Apple:** `SFSpeechRecognizer` notes that "For some languages, the recognizer might require an Internet connection", that "speech recognition is a network-based service", and that "Individual devices may be limited in the number of recognitions that can be performed per day". It also says "the framework stops speech recognition tasks that last longer than one minute". `supportsOnDeviceRecognition` reports whether it "can operate without network access". — [Apple, SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
- **Gboard (secondary, vendor blog):** on most non-Pixel phones "that cloud path is the default, and when offline, Gboard falls back to a small speech model that lives on your phone". Google's first on-device recognizer was reportedly about 85 MB. **This is a promotional third-party source, so treat it with caution.** — [Yaps blog](https://www.yaps.ai/blog/accurate-offline-speech-to-text-android.md)
- **FUTO Voice Input** runs an OpenAI Whisper model entirely on the device (secondary, same source). — [Yaps blog](https://www.yaps.ai/blog/accurate-offline-speech-to-text-android.md)
- Nota's desktop app already runs a hybrid of engines: built-in ONNX Hohe where it can run, with a Python Hohe fallback on macOS 13 and none on Intel Macs. — `/Users/rz/rz-codes/amharic-stt/CLAUDE.md` (repo).

### Inferences
- **Server only while downloading:** the first-run experience improves, since the user can dictate within seconds of installing. The server must still exist, be paid for, be disclosed in the store listings, and comply with the PDPP. It also disappears in a shutdown, when the download fails too. Its benefit depends on how long the 840 MB download takes. On 4G at ~10 Mbit/s that is ~11 minutes; on a weak 3G link, possibly hours.
- **Server as the path for low-end phones:** worth it only if a meaningful share of Nota's users have phones that cannot run the 723 MB model in memory or in acceptable time (minSdk 24 allows very old Android phones). A smaller on-device model, such as the 4-bit 427 MB Hohe at 6.89% CER in `docs/embedded-speech.md`, may reach those phones with no server at all.
- **The platform model:** Android's `triggerModelDownload` flow (ask the user, show progress, allow "scheduled" downloads, return a clear "not downloaded yet" error) is a good reference for Nota's own in-app model download UX, whatever the hosting choice.
- **Overall:** for an Amharic notes app whose users face expensive data, frequent regional shutdowns, data-localisation law and a privacy promise, server inference works best as an optional extra (opt-in, clearly labelled), never as the main path. Its running cost scales with use, while the on-device design's cost is a one-time download per model version.

### Gaps
- I found no Amharic or other African-language voice app that documents a cloud-to-device hybrid. The Amharic apps compared in the other research thread may cover it.
- I have no data on the share of Nota's (or Ethiopia's) Android phones with less than 4 GB of RAM, which decides whether a low-end-phone server path is needed.
- I did not find Apple's on-device recognition language list (whether Amharic is supported on-device or at all).
