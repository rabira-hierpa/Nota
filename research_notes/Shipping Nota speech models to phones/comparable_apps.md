# How comparable mobile apps get on-device speech and language models onto the phone, and how they update them

Research date: 6 November 2026. "Fetched Nov 2026" means the page was read during this research and showed no date of its own. Claims about an app's delivery method are marked **[documented]** when the developer, the store or the source code says so, **[inferred]** when they rest on app size or indirect evidence, and **[secondary]** when they come only from third-party reviews, blogs or search-result summaries. Sources from before 2024 are marked **(pre-2024, may have changed)**.

## Survey table: how each app gets its model onto the phone

### Takeaway
Of the third-party apps that ship models of about 0.5 GB or more, most ship a small app and download the model inside the app after install, usually from Hugging Face. Bundling the whole model in the store binary is rare (Aiko, 1.8 GB on iPhone, is the clear example). Apple, Google and Microsoft deliver per-language packs from their own servers, managed by the OS. Store-hosted delivery (Play AI packs, Apple-hosted Background Assets) is new, and I found no consumer app in this survey that documents using it.

### Cited Findings

| App / toolkit | Platform(s) | Model(s) and size | How the model reaches the phone | Usable before download? | How models update | Source (date) |
|---|---|---|---|---|---|---|
| Aiko (Sindre Sorhus) | iOS, iPadOS, macOS | Whisper medium, or small when free memory is low (iPhone/iPad); large v2 (Mac) | **Bundled in the binary [documented]**: "The app includes the Whisper AI models"; app is 1.8 GB on iPhone/iPad, 2.8 GB on Mac | Yes | With app updates (inferred: model is in the binary) | [sindresorhus.com/aiko](https://sindresorhus.com/aiko) (fetched Nov 2026) |
| Whisper Notes | iOS, macOS | Built-in "Parakeet Ultra" (from NVIDIA Parakeet V3); optional Whisper Small (iPhone), Large-V3-Turbo ~2 GB (Mac), SenseVoice, Qwen3-ASR 1.7B (Mac) | **Hybrid [documented]**: default Parakeet model "ships with the app" (app ~680 MB); other models are "optional downloads inside the app" (host not stated) | Yes (bundled default) | Bundled model with app updates; others by in-app download (host not stated) | [whispernotes.app/offline-transcribe](https://whispernotes.app/offline-transcribe) (updated 31 Oct 2026) |
| WhisperBoard (open source) | iOS | Whisper (WhisperKit Core ML) | **Hugging Face download via WhisperKit [documented in source]**: model folder is `huggingface/models/argmaxinc/whisperkit-coreml` in Documents | No (download from the in-app model browser) | User picks/downloads models in app | [TranscriptionStream.swift via GitHub code search](https://github.com/Saik0s/Whisperboard); [README](https://github.com/Saik0s/Whisperboard) (last push 18 Dec 2025) |
| Argmax WhisperKit (SDK used by many apps) | iOS, macOS | e.g. `large-v3-v20240930_626MB`, turbo, base, small, tiny | **Hugging Face download [documented]**: default repo `argmaxinc/whisperkit-coreml`; "automatically downloads the recommended model for the device"; `modelRepo` points to your own HF repo | Depends on app | Swap model name/repo; new model folders added to HF repo | [github.com/argmaxinc/WhisperKit](https://github.com/argmaxinc/WhisperKit) (fetched Nov 2026) |
| Whisper Transcription (MacWhisper for iOS, Good Snooze) | iOS 18+ | Whisper Tiny/Base (free), Tiny.en/Medium/Large (Pro) | **In-app download [documented]**: "on-device model that you can download to your device" (iPhone 15 or newer); app download 94.7 MB; also a cloud "Assistant" option | Yes for cloud; on-device needs download | In-app | [MacWhisper help](https://macwhisper.helpscoutdocs.com/article/33-macwhisper-for-ios); [App Store](https://apps.apple.com/app/apple-store/id1668083311) (fetched Nov 2026) |
| Superwhisper iOS | iOS (listing says iOS 26+) | Parakeet 476 MB, Parakeet multilingual 494 MB **[secondary]**; plus cloud models | **In-app download [inferred]** from 46 MB app size and third-party review; official page: offline models "work best on iPhone 15 and newer", cloud works on any device | Yes (cloud) | In-app | [superwhisper.com/ios](https://superwhisper.com/ios); [App Store](https://apps.apple.com/us/app/superwhisper/id6471464415); [tldv review](https://tldv.io/blog/superwhisper-review/) (fetched Nov 2026) |
| Scrib (F-Droid) | Android | Whisper-family, several sizes | **In-app download [documented]**: "models are downloaded separately and are not bundled in the app" | No | In-app | [f-droid.org/packages/org.scrib.transcriber](https://f-droid.org/ja/packages/org.scrib.transcriber/) (fetched Nov 2026) |
| Apple SpeechAnalyzer / SpeechTranscriber | iOS 26+ | Apple's own, per locale | **OS-managed download [documented, via WWDC25 notes]**: AssetInventory installs locale models into system storage; does not add to the app's size | No for an uninstalled locale | Apple updates via OS | [WWDC25 session 277 index](https://nonstrict.eu/wwdcindex/wwdc2025/277/); [Apple SpeechTranscriber docs](https://developer.apple.com/documentation/speech/speechtranscriber.md) (2025) |
| Google Live Transcribe | Android | Google's own, per language | **OS/app-managed language downloads [documented]**: download languages for offline use; multiple languages on Pixel and selected Android 12+ devices, English only on selected Android 8–11 | Online works first | Google-managed | [Google support](https://SUPPORT.GOOGLE.COM/accessibility/android/answer/9158064) (fetched Nov 2026); [9to5Google](https://9to5google.com/2022/03/10/google-live-transcribe-feature-now-works-when-offline/) (Mar 2022) |
| Google Translate offline packs | Android, iOS | ~35–45 MB per language (later reports); 160 MB German pack in 2013 | **Vendor server, per-language pack [documented, old]**; Wi-Fi recommended | Online works first | Vendor-managed | [The Register](https://www.theregister.co.uk/2013/03/28/google_translate_android_offline/) (2013, pre-2024); [Malay Mail](https://www.malaymail.com/news/tech/gadgets/2016/05/16/google-translate-brings-offline-mode-to-ios-and-tap-to-translate-to-other-a/1121221) (2016, pre-2024) |
| Microsoft Translator offline packs | Android, iOS | 181–230 MB per pack (2018 guide); neural packs ~50% smaller than earlier ones | **Vendor server, per-language pack [documented, old]** | Online works first | Vendor-managed | [ghacks](https://www.ghacks.net/?p=119168) (2018, pre-2024); [Windows Central](https://www.windowscentral.com/microsoft-translator-gets-offline-ai-powered-translations) (2018, pre-2024) |
| Vosk demo app | Android | Small models ~40–80 MB (e.g. small-en-us 40 MB) | **Bundled in APK assets, copied to files dir on first run [documented, partly secondary]** | Yes | With app updates | [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models); [DeepWiki on vosk-android-demo](https://deepwiki.com/alphacep/vosk-android-demo/2-architecture) (secondary) |
| Picovoice Leopard/Cheetah | Android, iOS, others | `.pv` model files (size not stated) | **Bundled in app assets [documented]**: place under `src/main/assets`; AccessKey required | Yes | With app updates | [Picovoice Leopard Android quick start](https://picovoice.ai/docs/quick-start/leopard-android/) (fetched Nov 2026) |
| sherpa-onnx / sherpa-ncnn demo APKs | Android | Varies; "most part of the APK is occupied by the pre-trained model"; runtime ~1.7 MB | **Bundled in APK assets [documented]** | Yes | Rebuild APK | [k2-fsa sherpa-onnx Android build](https://k2-fsa.github.io/sherpa/onnx/android/build-sherpa-onnx.html); [sherpa-ncnn Android build](https://k2-fsa.github.io/sherpa/ncnn/android/build-sherpa-ncnn.html) (fetched Nov 2026) |
| Moonshine | Android, iOS examples | Tiny ~26–30 MB; Small streaming ~134 MB | Not determined (example apps in GitHub releases) | Unknown | Unknown | [github.com/moonshine-ai/moonshine](https://github.com/moonshine-ai/moonshine); [Mintlify docs](https://www.mintlify.com/moonshine-ai/moonshine/concepts/models) (secondary) |
| PocketPal AI (open source) | iOS, Android | Any GGUF the user picks; built-in list (e.g. SmolVLM-500M Q8_0); TTS models (Kokoro ONNX) | **Hugging Face download [documented in source]**: `HF_DOMAIN = 'https://huggingface.co'`; built-in model URLs point to HF `resolve/main`; optional HF token for gated models | No (download a model first) | User downloads new models; app releases add entries | [README](https://github.com/a-ghorbani/pocketpal-ai); `src/config/urls.ts`, `src/store/builtinPalModels.ts` via GitHub code search; latest release v1.22.1 (5 Nov 2026) |
| MLC Chat | iOS, Android | LLMs, multi-GB | **Hugging Face download by default [documented]**; developers may bundle weights at build time | No | Model list in app config | [MLC LLM iOS docs](https://llm.mlc.ai/docs/deploy/ios.html) (fetched Nov 2026) |
| Private LLM | iOS, macOS | 140+ open models **[secondary count]** | **Hugging Face download [documented]**: "our models are hosted" on HF; China/HK locales use hf-mirror.com; a "built-in model" exists as fallback; App Store size 1.4 GB **[secondary]** | Yes, with built-in model **[inferred]** | New models added in app releases | [privatellm.app FAQ](https://privatellm.app/en/faq); [release notes](https://privatellm.app/en/release-notes) (fetched Nov 2026) |
| Locally AI (now LM Studio mobile) | iOS | MLX models | **Hugging Face (MLX Community) [documented for dev path; app UI secondary]**; LM Link lets the phone use models running on the user's computer | No | In-app | [ai.engineer org page](https://ai.engineer/orgs/locally-ai); [talk](https://ai.engineer/talks/running-gemma-4-on-device-40-tokens-s-on-iphone-with-mlx) (2026) |
| Layla | iOS (Android per third parties) | Default ~4 GB LLM (older listing); user GGUF | **In-app download after first start [documented in older listing]**; app 84–126 MB | No | In-app | [App Store](https://apps.apple.com/us/app/id6456886656) (fetched Nov 2026; 4 GB claim from an older listing version) |
| LLM Farm | iOS | User-supplied models | In-app download/import **[secondary]**; a store review reports progress "stuck at 22%" | No | In-app | [App Store](https://apps.apple.com/gb/app/llm-farm/id6461209867) (fetched Nov 2026) |
| Enchanted | iOS, macOS, visionOS | Whatever the user's Ollama server runs | **Server-based [documented]**: "You will need to run your own Ollama server" | Needs a server | Server side | [github.com/gluonfield/enchanted](https://github.com/gluonfield/enchanted) (fetched Nov 2026) |

### Inferences
- Among third-party apps with models of hundreds of MB or more, in-app download after install is the norm; Aiko is the one notable "everything in the binary" app at 1.8 GB on iPhone, and its developer explains that choice by the cost of building a downloader (see Whisper section).
- Hugging Face is the de facto model host for independent apps (WhisperKit-based apps, PocketPal, MLC Chat, Private LLM, Locally AI). None of the surveyed independent apps documents running its own model CDN.
- A "small bundled default + optional downloads" hybrid appears in Whisper Notes and Private LLM: the app works on first launch, and bigger or extra models are opt-in.

### Gaps
- Voicenotes, Just Press Record, Google Recorder, Speechmatics and Deepgram on-device: I did not find sourced delivery details in this pass.
- Exact iPhone model download sizes for Superwhisper and Whisper Transcription are not published by the developers.
- Whether Whisper Notes and Whisper Transcription download from Hugging Face or their own servers is not stated.

## Whisper-based and other offline transcription apps

### Takeaway
Transcription apps split into "bundle one mid-size model" (Aiko, Whisper Notes' default Parakeet) and "ship small, let the user download models" (WhisperBoard, Whisper Transcription, Superwhisper, Scrib). Developers who bundle cite simplicity; those who download offer many model sizes and gate big models to newer iPhones.

### Cited Findings
- Aiko's site says "The app includes the Whisper AI models", uses Whisper medium (or small when free memory is low) on iPhone/iPad and large v2 on Mac, and lists download sizes of 1.8 GB on iPhone/iPad and 2.8 GB on Mac. It also says adding downloadable models would be "a huge amount of work", and that languages cannot be deleted to save space because the model stores them together — [sindresorhus.com/aiko](https://sindresorhus.com/aiko) (fetched Nov 2026).
- Aiko's App Store listing (via search summary) shows 2.9 GB, requires iOS 17.4+ and an A12 or later — [App Store](https://apps.apple.com/jp/app/aiko/id1672085276?l=en-US) **[secondary: search summary; listing size likely the universal/Mac figure, conflicting with the site's 1.8 GB for iPhone]**.
- Whisper Notes ships a built-in Parakeet model (post-trained from NVIDIA Parakeet V3; English plus 24 European languages) with the app (~680 MB); Whisper Small (iPhone), Large-V3-Turbo (~2 GB, Mac), SenseVoice and Qwen3-ASR 1.7B (Mac) are "optional downloads inside the app" — [whispernotes.app/offline-transcribe](https://whispernotes.app/offline-transcribe) (updated 31 Oct 2026). A search summary claimed "a Whisper AI model downloads" at install; the fetched page contradicts that for the default model, so prefer the page.
- WhisperKit downloads models from `argmaxinc/whisperkit-coreml` on Hugging Face, picks "the recommended model for the device" when none is given, and accepts `modelRepo` for a developer's own HF repo; Argmax recommends `large-v3-v20240930_626MB` for multilingual accuracy — [WhisperKit README](https://github.com/argmaxinc/WhisperKit) (fetched Nov 2026).
- WhisperBoard stores models at `Documents/huggingface/models/argmaxinc/whisperkit-coreml`, i.e. WhisperKit's HF download; its README says users "Browse and download any Whisper model directly from the app" — [WhisperBoard repo](https://github.com/Saik0s/Whisperboard) (source via GitHub code search; last push 18 Dec 2025).
- Whisper Transcription (MacWhisper for iOS) offers an "on-device model that you can download to your device for offline use" on iPhone 15 or newer, plus a cloud Assistant needing internet — [MacWhisper help](https://macwhisper.helpscoutdocs.com/article/33-macwhisper-for-ios); app is 94.7 MB and requires iOS 18; free tier Tiny/Base, Pro adds Medium/Large — [App Store](https://apps.apple.com/app/apple-store/id1668083311) (fetched Nov 2026).
- Superwhisper iOS app is 46 MB; offline models "work best on iPhone 15 and newer", cloud models work on any device — [superwhisper.com/ios](https://superwhisper.com/ios); [App Store](https://apps.apple.com/us/app/superwhisper/id6471464415). Model sizes Parakeet 476 MB / multilingual 494 MB come only from a third-party review — [tldv](https://tldv.io/blog/superwhisper-review/) **[secondary]**.
- Scrib (Android, F-Droid): "models are downloaded separately and are not bundled in the app"; larger models are "bigger to download" — [F-Droid](https://f-droid.org/ja/packages/org.scrib.transcriber/) (fetched Nov 2026).

### Inferences
- Aiko is the closest analogue to "bake it in": a single model of roughly Nota's size (1.8 GB iOS app vs Nota's ~840 MB of models) shipped inside the App Store binary, apparently accepted by App Review. Its stated trade-off is that every app update redistributes the model and nothing is selectable.
- Apps that download models usually gate on-device models to newer phones (iPhone 15+ for Whisper Transcription and Superwhisper), which suggests memory, not storage, is their binding limit for ~0.5–1.5 GB models.

### Gaps
- No source found on how Aiko's updates handle the 1.8 GB payload (App Store delta updates for an unchanged model file were not researched).
- No Android equivalent of Aiko (a ~1 GB model bundled in a Play app) was found and documented.

## Big-platform on-device speech (Apple, Google, Microsoft)

### Takeaway
Apple, Google and Microsoft all download per-language speech or translation packs from their own servers after install, managed by the OS or app, with Wi-Fi guidance. None of these platforms supports Amharic on-device speech in a way an app can rely on: iOS does not support Amharic recognition, and Android's Amharic offline pack is not confirmed.

### Cited Findings
- iOS 26 SpeechAnalyzer: apps request locale models through the AssetInventory API; the model lives in system storage and does not increase the app's download or storage size — [WWDC25 session 277 notes](https://nonstrict.eu/wwdcindex/wwdc2025/277/) **[secondary index of Apple's session]**; `SpeechTranscriber.supportedLocales` lists locales "that may not be installed but are downloadable" — [Apple docs](https://developer.apple.com/documentation/speech/speechtranscriber.md) (2025). A Japanese article puts support at about 40 locales — [issoh.co.jp](https://www.issoh.co.jp/tech/details/8929/) **[secondary]**.
- The `amharic_stt` Flutter package says iOS Amharic recognition is "Not supported at time of writing", and on Android offline Amharic needs a downloaded language pack that "most devices lack" and apps cannot install programmatically; the author also says the plugin has not been run on a device — [pub.dev amharic_stt](https://pub.dev/documentation/amharic_stt/latest/) (v0.1.1; no date shown) **[secondary, unverified by its own author]**.
- Google added Amharic (Ethiopia) to Gboard voice typing in 2017 among 30 new languages — [Engadget](https://www.engadget.com/2017/08/14/google-voice-support-international-languages/) (Aug 2017, pre-2024). No source confirms Amharic offline voice typing.
- Live Transcribe lets users "download languages for offline use"; multiple languages on Pixel and selected Android 12+ devices, English only on selected Android 8–11 devices — [Google support](https://SUPPORT.GOOGLE.COM/accessibility/android/answer/9158064) (fetched Nov 2026); offline mode launched March 2022 — [9to5Google](https://9to5google.com/2022/03/10/google-live-transcribe-feature-now-works-when-offline/) (pre-2024).
- Google Translate offline packs: German pack 160 MB in 2013 with Wi-Fi advice — [The Register](https://www.theregister.co.uk/2013/03/28/google_translate_android_offline/) (pre-2024); about 30 MB per pack on iOS in 2016 — [Malay Mail](https://www.malaymail.com/news/tech/gadgets/2016/05/16/google-translate-brings-offline-mode-to-ios-and-tap-to-translate-to-other-a/1121221) (pre-2024).
- Microsoft Translator offline packs were 181–230 MB each in a 2018 guide — [ghacks](https://www.ghacks.net/?p=119168) (pre-2024); neural packs were ~50% smaller than earlier packs — [Windows Central](https://www.windowscentral.com/microsoft-translator-gets-offline-ai-powered-translations) (2018, pre-2024).

### Inferences
- The platform pattern (download per language on demand, from the vendor's CDN, Wi-Fi recommended, updated silently) is what users in many markets already know from Translate and Gboard. It corresponds to "app downloads its own model" rather than "bundle", but backed by infrastructure Nota does not have.
- Nota cannot lean on the OS: Apple has no Amharic recognizer and Google's offline Amharic is unconfirmed, which supports Nota shipping its own model.

### Gaps
- Current sizes of Google/Microsoft offline packs (all figures found are 2013–2018).
- Whether Gboard offers an Amharic offline speech pack as of Nov 2026.
- Google Recorder's model delivery (Pixel-only, presumably system-bundled) was not sourced.

## SDKs and toolkits

### Takeaway
Speech SDKs aimed at small models (Vosk small ~40–80 MB, Picovoice `.pv`, sherpa-onnx demos, Moonshine Tiny ~30 MB) bundle the model in the app's assets. Toolkits built around larger models (WhisperKit, MLC LLM) default to a Hugging Face download, with bundling as an option.

### Cited Findings
- Vosk: a small model "typically is around 50Mb in size and requires about 300Mb of memory in runtime"; big server models "require up to 16Gb in memory"; no Amharic model listed — [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models) (undated; model filenames dated 2020–2022, pre-2024).
- The Vosk Android demo packages the model as assets in a `:models` module and `StorageService` copies it from the APK to the app's files directory on first run — [DeepWiki on vosk-android-demo](https://deepwiki.com/alphacep/vosk-android-demo/2-architecture) **[secondary]**.
- Picovoice Leopard on Android: add the `.pv` model "as a bundled resource by placing it under the `${ANDROID_APP}/src/main/assets` directory"; an AccessKey from Picovoice Console is required — [Picovoice docs](https://picovoice.ai/docs/quick-start/leopard-android/) (fetched Nov 2026).
- sherpa-onnx's official Android guide places the pre-trained model in `app/src/main/assets/` and builds the APK — [k2-fsa docs](https://k2-fsa.github.io/sherpa/onnx/android/build-sherpa-onnx.html); for sherpa-ncnn, "most part of the APK is occupied by the pre-trained model" and the runtime is ~1.7 MB — [sherpa-ncnn docs](https://k2-fsa.github.io/sherpa/ncnn/android/build-sherpa-ncnn.html) (fetched Nov 2026).
- A third-party React Native wrapper for sherpa-onnx recommends bundling only when models total under 50 MB and Play Asset Delivery for models over 100 MB — [react-native-sherpa-onnx docs](https://www.mintlify.com/XDcobra/react-native-sherpa-onnx/configuration/play-asset-delivery) **[secondary]**.
- Moonshine offers "tiny 26MB models"; Small streaming is ~134 MB (30 MB encoder, 104 MB decoder) — [Moonshine repo](https://github.com/moonshine-ai/moonshine); [Mintlify docs](https://www.mintlify.com/moonshine-ai/moonshine/concepts/models) **[secondary]**.
- MLC LLM: "By default, we download the model weights from Hugging Face when running the app"; bundling weights at build time is optional — [MLC docs](https://llm.mlc.ai/docs/deploy/ios.html) (fetched Nov 2026).

### Inferences
- The SDK defaults line up with model size: under ~150 MB, bundle; at ~0.5 GB and up, download. Nota's 723 MB + 117 MB pair sits in the "download" band by that convention.

### Gaps
- Picovoice default model sizes, and whether its mobile SDKs phone home for AccessKey validation, were not stated in the page read.
- Speechmatics and Deepgram on-device delivery: not researched successfully.
- Whether Moonshine's official example apps bundle or download models.

## On-device LLM chat apps

### Takeaway
LLM apps with multi-GB models almost all ship a small app and download models from Hugging Face inside the app, with the user choosing models; model "updates" are new entries in a list, not silent replacements. Private LLM documents that some networks block Hugging Face and falls back to a mirror.

### Cited Findings
- PocketPal AI: users download models from a list or search Hugging Face for GGUF; a Settings token handles gated models; "model and voice downloads" are network traffic that never includes chats — [PocketPal README](https://github.com/a-ghorbani/pocketpal-ai). Source code sets `HF_DOMAIN = 'https://huggingface.co'` and points built-in models at HF `resolve/main` URLs; TTS models also come from HF (Kokoro-82M ONNX); latest release v1.22.1 on 5 Nov 2026 — [pocketpal-ai source](https://github.com/a-ghorbani/pocketpal-ai) (via GitHub code search/API).
- Private LLM: models are hosted on Hugging Face; China/Hong Kong locales use hf-mirror.com; if a network blocks Hugging Face the FAQ suggests home Wi-Fi, a hotspot or a VPN; "An internet connection is only required when you opt to download updates or new models"; a built-in model is the fallback after a loading crash — [Private LLM FAQ](https://privatellm.app/en/faq) (fetched Nov 2026). App Store size 1.4 GB — [search summary of App Store listing](https://apps.apple.com/gb/app/id6448106860) **[secondary]**.
- MLC Chat downloads weights from Hugging Face by default — [MLC docs](https://llm.mlc.ai/docs/deploy/ios.html).
- Locally AI uses MLX models from Hugging Face's MLX Community; LM Studio completed its acquisition in April 2026, and its LM Link lets iPhone users reach larger models running on their computers — [ai.engineer](https://ai.engineer/orgs/locally-ai) (2026) **[app download UI not documented]**.
- Layla: an older App Store description says it downloads a 4 GB LLM "after it starts for the first time"; app is 84–126 MB; requires iOS 17.6+ — [App Store](https://apps.apple.com/us/app/id6456886656) (fetched Nov 2026; the 4 GB text is from an older listing version).
- Enchanted needs the user's own Ollama server ("You will need to run your own Ollama server") — [Enchanted repo](https://github.com/gluonfield/enchanted).
- LLM Farm App Store review reports a download stuck at "22% or random small number" — [App Store](https://apps.apple.com/gb/app/llm-farm/id6461209867) **[secondary, single review via search summary]**. A troubleshooting guide says failed model downloads in most of these apps restart from zero rather than resume and advises twice the model size in free storage — [llmconfigurator](https://llmconfigurator.com/en/guides/troubleshooting/ios-llm-download-storage-background) **[secondary, low authority]**.

### Inferences
- Private LLM's mirror and VPN advice is a concrete warning for Nota: if Hugging Face is slow or blocked on some Ethiopian networks, an HF-only download would fail with no fallback. A Nota-controlled mirror or a second host would hedge this.
- Resume support matters at 840 MB: the reported "stuck" and "starts over" failures are the most common user complaint pattern found for multi-hundred-MB in-app downloads.

### Gaps
- No primary statement from these apps on resumable/background download implementation (iOS background URLSession, Android WorkManager).
- No Play Store details for Layla.

## African-language and Amharic speech apps

### Takeaway
I found no shipping consumer mobile app that does offline Amharic speech recognition with its own model, so there is no Amharic precedent for model delivery. Nota would be among the first.

### Cited Findings
- Lesan AI is a machine-translation company for low-resource languages; no offline speech product surfaced — [search result summary of Lesan AI](https://joinef.com/?p=2945) **[secondary]**.
- A Hugging Face Space runs Meta MMS Amharic text-to-speech locally, needing no internet after a ~330 MB model download (TTS, not recognition) — [HF dataset/space page](https://huggingface.co/datasets/Hope226/amharic_tts) **[secondary via search summary]**.
- A 2017 Addis Ababa University thesis built an offline, small-vocabulary, speaker-dependent Amharic recognizer on Pocketsphinx for phones — [AAU ETD](https://etd.aau.edu.et/items/cab4d223-b40e-43d3-aa16-c4ad0f1800fd) (pre-2024).
- `amharic_stt` (Flutter) ships no model and wraps the OS recognizer; iOS Amharic unsupported; Android offline needs a pack most devices lack — [pub.dev](https://pub.dev/documentation/amharic_stt/latest/).
- A blog describes an offline Amharic voice-tutor app using a Whisper model compressed to 200 MB — [techfordev](https://techfordev.netlify.app/articles/3520986) **[secondary, unverified]**.
- Vosk lists no Amharic model — [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models).

### Inferences
- With no Amharic-specific precedent, the closest analogues for Nota are general Whisper apps (Aiko bundles; most others download).

### Gaps
- No data found on Ethiopian users' tolerance for large app or model downloads, mobile data prices, or Hugging Face reachability from Ethio Telecom/Safaricom Ethiopia.
- Whether Google Play and the App Store are fully available to Ethiopian users (and how many sideload APKs) was not researched.

## Store delivery mechanisms and App Review / Play issues

### Takeaway
Both stores now host large model files for free, but with constraints that matter for Nota: Play AI packs allow 1.5 GB per pack and update only with the app; Apple-hosted Background Assets allow independent pack updates but require iOS 26+, and App Review tests the app with pre-launch downloads disabled, so a size-disclosing download screen is mandatory.

### Cited Findings
- Play for On-device AI: AI packs deliver models install-time (installed as an APK), fast-follow (background after install; "Users may open your app before your model has been fully downloaded") or on-demand; "Individual AI packs can be up to 1.5GB, based on their compressed download sizes. The maximum cumulative app size ... is 4GB"; hosting is "at no additional cost" — [Android developers](https://developer.android.com/google/play/on-device-ai) (fetched Nov 2026; page undated).
- Play AI packs "are updated together with the app binary"; unchanged packs are not re-downloaded thanks to patching ("Play will just download what's changed") — same source.
- Play: if a download exceeds 200 MB and the user is not on Wi-Fi, it waits for explicit consent (`WAITING_FOR_WIFI`, `showConfirmationDialog()`); sideloaded apps get `REQUIRES_USER_CONFIRMATION` — same source.
- Play device targeting can send different model variants by RAM, SoC or device model (AGP 8.10+); AI packs need AGP 8.8+; the Play AI Delivery Library is `0.1.1-alpha01`; "Models downloaded by Play for On-device AI should only be used by your apps" — same source.
- Apple-hosted asset packs: 200 GB total and 200 packs per app record — [App Store Connect help](https://developer.apple.com/help/app-store-connect/reference/apple-hosted-asset-pack-size-limits) (fetched Nov 2026); no per-pack limit is listed on that page.
- Managed Background Assets require apps "targeting iOS 26 ... and later"; packs download "separately from your app build" and can be uploaded "separately from your app build" — [App Store Connect help overview](https://developer.apple.com/help/app-store-connect/manage-asset-packs/overview-of-apple-hosted-asset-packs) (fetched Nov 2026). A third-party blog says the unmanaged path is the only option for older deployment targets and requires self-hosting — [blakecrosley.com](https://blakecrosley.com/es/blog/on-demand-resources-deprecated-background-assets) **[secondary]**.
- The same blog says iOS 27 release notes deprecate On-Demand Resources in favour of Background Assets, with no removal date — [blakecrosley.com](https://blakecrosley.com/es/blog/on-demand-resources-deprecated-background-assets) **[secondary; not verified against Apple release notes]**.
- App Review: an Apple Frameworks Engineer said "pre-launch downloads are disabled for App Review" (like a user who turned off In-App Content), so the fallback screen must disclose the download size under 4.2.3(ii), using each pack's `downloadSize` — [Apple Developer Forums thread 815174](https://developer.apple.com/forums/thread/815174) (Mar 2026). Developers in the same thread reported unresolved review failures (Apr 2026), Catalyst lookup failures (May 2026) and missing files on iOS 26.5 even in TestFlight (Jun 2026) — same thread.
- App Store Review Guideline 4.2.3(ii): "If your app needs to download additional resources in order to function on initial launch, disclose the size of the download and prompt users before doing so." Guideline 2.5.2 bars downloading "code which introduces or changes features or functionality" — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (fetched Nov 2026).
- A Play-hosted Gemma model of 584 MB is the subject of a ProAndroidDev post — [ProAndroidDev](https://proandroiddev.com/shipping-a-584-mb-gemma-model-through-google-play-b4df1825c6b8) (could not be read: HTTP 403). A blog reports splitting larger LLMs into ~1,200 MB chunks to fit the 1.5 GB pack cap — [ringringdeven blog](https://ringringdeven.blogspot.com/2026/05/delivering-large-llms-via-google-play.html) (May 2026) **[secondary, via search summary]**.

### Inferences
- Nota's two models (723 MB + 117 MB, before compression; ONNX int8 weights compress little) fit one Play AI pack under 1.5 GB, or two packs, without splitting.
- On Android, a model update via AI packs means a new app release; because the ONNX file changes as a whole, Play's patching likely saves little on a model change (not verified).
- On iOS, Apple-hosted packs would let Nota update models without an app release, but only on iOS 26+; Nota's iOS 16–25 users would need a bundled model or a self-hosted download path. The forum reports from 2026 show the feature still has review and reliability rough edges.
- Model files are data, not code, so 2.5.2 should not bar downloading them (inference; no Apple statement on ML models found). The binding rule is 4.2.3(ii): show the size and ask before downloading.

### Gaps
- No primary Apple per-pack size limit, or the exact essential/prefetch/on-demand download policy semantics, was retrieved (the Apple doc page returned no body).
- No surveyed consumer speech or LLM app was found documenting use of Play AI packs or Apple-hosted Background Assets.
- Flutter support for AI packs and Background Assets (plugins or method channels) was outside this scope and not checked.
- Apple's current cellular download limits for large App Store binaries were not researched.

## Patterns for ~1 GB models and what users report

### Takeaway
For models around 1 GB, the dominant pattern among comparable third-party apps is: small binary, in-app download from Hugging Face, user-chosen model, with a smaller bundled default in some apps. User complaints concentrate on downloads that stall or restart, and on re-downloading models that should have been cached.

### Cited Findings
- Bundled: Aiko (1.8 GB iPhone app, models included) — [sindresorhus.com/aiko](https://sindresorhus.com/aiko); Whisper Notes' default Parakeet (~680 MB app) — [whispernotes.app](https://whispernotes.app/offline-transcribe).
- Downloaded in-app (HF): WhisperKit apps incl. WhisperBoard — [WhisperKit](https://github.com/argmaxinc/WhisperKit); PocketPal — [pocketpal-ai](https://github.com/a-ghorbani/pocketpal-ai); MLC Chat — [MLC docs](https://llm.mlc.ai/docs/deploy/ios.html); Private LLM — [FAQ](https://privatellm.app/en/faq).
- Downloaded in-app (host not stated): Whisper Transcription — [MacWhisper help](https://macwhisper.helpscoutdocs.com/article/33-macwhisper-for-ios); Superwhisper **[inferred from 46 MB app]** — [App Store](https://apps.apple.com/us/app/superwhisper/id6471464415); Layla — [App Store](https://apps.apple.com/us/app/id6456886656); Scrib — [F-Droid](https://f-droid.org/ja/packages/org.scrib.transcriber/).
- Server-based: Enchanted (user's own Ollama) — [repo](https://github.com/gluonfield/enchanted); cloud options alongside on-device in Whisper Transcription and Superwhisper — [MacWhisper help](https://macwhisper.helpscoutdocs.com/article/33-macwhisper-for-ios); [superwhisper.com/ios](https://superwhisper.com/ios).
- User reports: Longhand (GrapheneOS) users complained the app "seems to re-download the model every time" when switching language packs and asked for caching — [GrapheneOS forum](https://discuss.grapheneos.org/d/42496-introducing-longhand-a-call-recording-transcription-app-for-graphene-os/24) **[via search summary]**; LLM Farm review: download "stuck at 22%" — [App Store](https://apps.apple.com/gb/app/llm-farm/id6461209867) **[via search summary]**; an Aiko reviewer complained about repetition on silent audio, not about size — [App Store](https://apps.apple.com/jp/app/aiko/id1672085276?l=en-US) **[via search summary]**.

### Inferences
- For Nota (one fixed Amharic model, no model menu needed, privacy promise), the two realistic precedents are Aiko-style bundling and the hybrid "download once with size disclosure, resume support, Wi-Fi prompt". Server inference (Enchanted-style) contradicts Nota's "notes stay on the phone" promise.
- Users' recurring complaints point to engineering requirements for any download path: resumable downloads, integrity checks, never re-downloading an unchanged model, and clear progress.

### Gaps
- No review corpus or survey quantifying how many users abandon apps at a first-launch download of ~1 GB.
- No reports from Ethiopian users specifically.
