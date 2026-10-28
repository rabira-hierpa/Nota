# ድምፅ ወደ ጽሑፍ · Amharic Speech to Text

A small desktop app: press **New recording**, speak Amharic, press **Stop**, and
the text appears ready to edit. Recordings are listed on the left; the
transcript and playback controls are on the right. Everything stays on your
machine.

Transcription uses [BuzzASR/amharic](https://huggingface.co/BuzzASR/amharic),
a Whisper large-v3 model fine-tuned on Amharic, run locally on the Python
runtime that [VoiceStudio](https://github.com/debpalash/VoiceStudio) installs.
VoiceStudio's own speech engine is still available as an option (below).

## Requirements

- macOS on Apple Silicon (the model runs on the GPU; other setups fall back to
  the CPU and are slower)
- Node.js 22+
- [VoiceStudio](https://github.com/debpalash/VoiceStudio) 0.5.7+ installed,
  with its first-run setup finished (the app reuses its Python runtime)
- About 3.1 GB of disk for the model, and about 6 GB of free memory while
  transcribing

## Set up the Amharic model

```bash
npm run setup:amharic-model
```

This downloads the pinned model revision into the Hugging Face cache (once)
and prepares a model folder in the app's data directory. The sidebar footer
shows **Amharic model ready** once it is in place, or explains what is
missing.

### Why not VoiceStudio's Whisper?

Stock Whisper (including large-v3, VoiceStudio's usual default) learned almost
no Amharic. It writes Ge'ez letters that follow the sounds but are not words,
and on auto-detect it often mistakes Amharic for Tibetan. On the FLEURS Amharic
test set, large-v3 scores about **193% character error**; BuzzASR/amharic
reports about **12% character error / 34% word error**.

VoiceStudio can't run the fine-tune itself: its Whisper engines always decode
with timestamps, and this model was trained without them, so it returns no
text. The app decodes it directly instead
([`electron/python/amharic_transcriber.py`](electron/python/amharic_transcriber.py)):
float32 (half precision on Apple GPUs also returns nothing), no timestamps, and
long recordings split at pauses into chunks under 30 s. The helper starts on
the first transcription (a few seconds to load) and exits after five idle
minutes to free its memory.

The setup script also corrects the model's `generation_config.json`, which as
published makes transformers 5.x drop its Whisper settings. The Hugging Face
cache itself is left unchanged.

## Run it

```bash
npm install
npm run setup:amharic-model
npm run dev
```

`npm run dev` starts the Next.js renderer on port 3123, rebuilds the Electron
main process on change, and opens the app window. The first recording asks for
microphone access; pick the microphone under **New recording** if the default
isn't the one you speak into.

To run the production build instead:

```bash
npm run build && npm start
```

To make a distributable (`release/`):

```bash
npm run package
```

## Configuration

Set these in the environment, or in a `.env` file (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `STT_ENGINE` | `amharic-model` | `voicestudio` sends recordings to VoiceStudio's engine instead |
| `AMHARIC_MODEL_DIR` | `<user data>/models/BuzzASR-amharic-3002b3f` | Prepared model folder |
| `VOICESTUDIO_PYTHON` | VoiceStudio's runtime interpreter | Python that runs the model |
| `VOICESTUDIO_URL` | `http://127.0.0.1:3900` | VoiceStudio speech API (`STT_ENGINE=voicestudio`) |
| `OMNIVOICE_API_KEY` | (none) | Bearer key for a remote VoiceStudio |

Recordings, transcripts and the model folder live in the app's user-data
folder (`~/Library/Application Support/Amharic Speech to Text` on macOS).

## Checks

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e
```

Unit tests cover the model helper's process handling with a fake helper. The
e2e suite builds the app, then drives it with Chromium's fake microphone and a
fake VoiceStudio, covering record → transcribe → edit → play → relaunch, the
engine-offline path, and silent microphones.

## How it is built

Electron main process (`electron/`) + Next.js static export renderer (`src/`),
sharing a Zod-validated IPC contract (`shared/`). File organisation and
architecture follow the Dandii app's rules; see [CLAUDE.md](CLAUDE.md) and
[`.claude/rules/`](.claude/rules).
