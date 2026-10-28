# ድምፅ ወደ ጽሑፍ · Amharic Speech to Text

A small desktop app: press **New recording**, speak Amharic, press **Stop**, and
the text appears ready to edit. Or press **Dictate** and watch the text appear
after each pause while you are still speaking. Recordings are listed on the
left; the transcript and playback controls are on the right. Everything stays
on your machine.

Two Amharic speech models run locally on the Python runtime that
[VoiceStudio](https://github.com/debpalash/VoiceStudio) installs; pick one
under the record buttons. VoiceStudio's own speech engine is still available
as an option (below).

## Requirements

- macOS on Apple Silicon (the model runs on the GPU; other setups fall back to
  the CPU and are slower)
- Node.js 22+
- [VoiceStudio](https://github.com/debpalash/VoiceStudio) 0.5.7+ installed,
  with its first-run setup finished (the app reuses its Python runtime)
- About 5.5 GB of disk for both models (2.4 GB for Hohe alone), and 2.5 GB
  (Hohe) or 4.5 GB (BuzzASR) of free memory while transcribing

## The models

| | **Hohe** (default) | **BuzzASR** |
|---|---|---|
| Model | [snapwre/hohe-asr-amharic](https://huggingface.co/snapwre/hohe-asr-amharic) | [BuzzASR/amharic](https://huggingface.co/BuzzASR/amharic) |
| Kind | wav2vec2-BERT 600M + CTC: one pass over the audio | Whisper large-v3 (1.55B) fine-tune: writes text token by token |
| Reported FLEURS Amharic error | 6.3% characters, 17.9% words (no language model) | ~12% characters, ~34% words |
| A 19 s clip on an M-series GPU | 0.7 s | 4–7 s |
| Memory while loaded | about 2.5 GB | 4.4 GB |
| Licence | CC BY 4.0 (credit below) | MIT |
| Weak spots (per its card) | spontaneous conversation (~47% word error), spells numbers out, no punctuation | can invent text for silence, slower |

On a test recording ("ሙከራ ሙከራ አንድ ሁለት ሶስት, ይህ አማርኛን ወደ ጽሁፍ የሚቀይር …")
Hohe heard *አንድ ሁለት ሶስት*, *አማርኛን* and *አፕ* where BuzzASR wrote *አንዱ ለስላሳ
ውስጥ*, *አማሪኛ* and *መጠን*. One recording is not a benchmark; switch models and
press **Transcribe again** to compare on your own voice (the header says which
model wrote the text).

Hohe's card also ships a 5-gram language model (`lm/`, 538 MB, worth about two
points of word error on its test set). The app leaves it out: it needs a
compiled `kenlm`, and on the test recording it changed only the spacing of one
word.

## Set up the models

```bash
npm run setup:amharic-model            # both
npm run setup:amharic-model -- hohe    # or just one: hohe | buzzasr
```

This downloads each pinned model revision into the Hugging Face cache (once)
and prepares a model folder in the app's data directory. The sidebar footer
shows **Hohe ready** (or **BuzzASR ready**) for the chosen model, or explains
what is missing.

### Why not VoiceStudio's Whisper?

Stock Whisper (including large-v3, VoiceStudio's usual default) learned almost
no Amharic. It writes Ge'ez letters that follow the sounds but are not words,
and on auto-detect it often mistakes Amharic for Tibetan. On the FLEURS Amharic
test set, large-v3 scores about **193% character error**.

VoiceStudio can't run BuzzASR either: its Whisper engines always decode with
timestamps, and BuzzASR was trained without them, so it returns no text. The
app decodes both models itself
([`electron/python/amharic_transcriber.py`](electron/python/amharic_transcriber.py)),
picking the decoder from the model's `config.json`. BuzzASR runs without
timestamps in float16 with eager attention (with PyTorch's default attention,
half precision on Apple GPUs returns nothing); Hohe runs in float32. Long
recordings are split at pauses into chunks under 30 s. A helper process starts
when you press record or dictate (a few seconds to load), exits after five
idle minutes, and the other model's helper exits when you switch.

The setup script also corrects BuzzASR's `generation_config.json`, which as
published makes transformers 5.x drop its Whisper settings. The Hugging Face
cache itself is left unchanged.

## Dictation

**Dictate** streams the microphone (an AudioWorklet at 16 kHz) through a pause
detector: after 0.5 s of quiet, the speech since the last pause is sent to the
chosen model and its text is appended on screen. Stop saves the whole
recording with that text, like any other. If a piece fails, the whole
recording is transcribed again when you stop, so nothing is lost. The first
words wait for the model to load; after that the text keeps up with speech on
either model.

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
| `STT_ENGINE` | (local models) | `voicestudio` sends recordings to VoiceStudio's engine instead |
| `HOHE_MODEL_DIR` | `<user data>/models/hohe-asr-amharic-217712d` | Prepared Hohe folder |
| `BUZZASR_MODEL_DIR` | `<user data>/models/BuzzASR-amharic-3002b3f` | Prepared BuzzASR folder |
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

Unit tests cover the model helper's process handling with a fake helper, the
pause detector, and the dictation flow. The e2e suite builds the app, then
drives it with Chromium's fake microphone and a fake VoiceStudio, covering
record → transcribe → edit → play → relaunch, the engine-offline path, silent
microphones, and dictation (with a microphone that speaks in phrases).

## How it is built

Electron main process (`electron/`) + Next.js static export renderer (`src/`),
sharing a Zod-validated IPC contract (`shared/`). File organisation and
architecture follow the Dandii app's rules; see [CLAUDE.md](CLAUDE.md) and
[`.claude/rules/`](.claude/rules).

## Credits

Hohe ASR (`snapwre/hohe-asr-amharic`) is by Chapi and the Dataset.ET
contributors, licensed CC BY 4.0, fine-tuned from
`badrex/Ethio-ASR-multilingual-600M` (CC BY 4.0). BuzzASR/amharic is MIT
licensed. Neither model is bundled with the app; the setup script downloads
them from Hugging Face.
