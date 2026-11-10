# Nota for Android and iOS

Nota's phone app: Amharic notes you write or speak, offline. It keeps the
desktop app's notes features (sections, nested `#tags`, search, `[[links]]`,
Ethiopian dates, summarize and organize) and runs the same built-in Hohe
speech model, with the punctuation model, on the phone through ONNX Runtime.
The interface is in English or Amharic.

## Build and run

Flutter 3.47 or later. Android needs Android 7.0 (API 24) or later. iOS needs
16.0 or later; the iOS packages come from Swift Package Manager, so CocoaPods
isn't needed.

```bash
flutter pub get
flutter run                                   # on a connected phone or emulator
flutter build apk --release --split-per-abi   # Android: one APK per CPU type
flutter build ios                             # iOS: then sign and install from Xcode
```

The release APKs are still signed with the debug key.

On an iPhone, the app needs signing. Open `ios/Runner.xcworkspace` in Xcode,
choose the Runner target, then Signing & Capabilities, and pick your team. A
free Apple ID works, but its builds stop opening after 7 days. Turn on
Developer Mode on the iPhone (Settings › Privacy & Security), connect it, then
run `flutter run --release`.

After `flutter pub get` or `flutter test`, the next iOS build can stop with
"flutter-onnxruntime requires minimum platform version 16.0". Flutter rewrites
its plugin package for iOS 15 and raises it to the app's 16.0 one build later.
Run `flutter build ios --config-only` first, or build again.

## The speech models

The models (841 MB) don't ship in the app. The Speech models screen downloads
them from `https://models.nota.et/v1/`, and checks each file's SHA-256 before
using it; a stopped download picks up where it left off. They can also be
copied in: build them on a computer with `npm run build:speech` in the
repository root, then copy the four files from `models/` (`hohe-w8.onnx`,
`hohe.json`, `punct-w8.onnx`, `punct.json`) to the phone. The app's Speech
models screen shows these steps too.

- **Android:** open Nota once, then copy the files into
  `Android/data/com.rzcodes.nota/files/models` over USB, or with adb:
  `adb push hohe-w8.onnx hohe.json punct-w8.onnx punct.json /sdcard/Android/data/com.rzcodes.nota/files/models/`
- **iOS:** in Finder (or Apple Devices on Windows), open the iPhone, go to
  Files and drop the four files on Nota.
- **Either:** Import files on the Speech models screen picks them from the
  phone, a memory card or a USB drive, and checks each one.

### Where the download comes from

`models.nota.et` is the Cloudflare R2 bucket `nota-models`, connected as a
custom domain. Each set of files has its own folder (`v1/`), because the app
pins every file's size and hash in `lib/features/speech/hohe/model_files.dart`:
new models go in a new folder with the new hashes, and the default in
`model_store.dart` moves with them, so older builds keep downloading the files
they expect. Upload with rclone (a remote named `r2`; the dashboard and
Wrangler can't take the 723 MB file in one piece):

```bash
cd models
rclone copy . r2:nota-models/v1 --include "*.onnx" --include "*.json" --include "LICENSE-*.txt" --include NOTICE \
  --header-upload "Cache-Control: public, max-age=31536000, immutable" --s3-chunk-size 64M
```

Keep `NOTICE` and the licence texts beside the models: Hohe's CC BY licence
asks for the credits wherever the files are shared. A build can download from
somewhere else with `--dart-define=NOTA_MODELS_URL=<base URL>`, or offer no
download with an empty one.

Transcribing needs about 2 GB of free memory.

## Tests

```bash
flutter analyze
flutter test
```

`integration_test/hohe_eval_test.dart` runs Hohe on a phone or emulator
against clips with known text, and prints accuracy, speed and memory as
numbers only. Its header says how to put the clips on the device.

Code layout: `lib/features/notes` (data, logic, state, screens, widgets),
`lib/features/speech` (`hohe/` is the ONNX pipeline ported from
`electron/speech/`, `audio/`, `models/`, `state/`, `widgets/`), `lib/l10n`
(English and Amharic, the same shape) and `lib/app` (theme, startup).
