# Nota · ማስታወሻ

Amharic notes you can write or speak, modelled on [Bear](https://bear.app).
Three columns: where to look (Notes, Favorites, Voice notes, Untagged, your
tags, Trash), the notes there, and the open note in a rich-text editor.
Everything stays on your machine.

- **Write** with formatting: headings, bold, italic, underline, strikethrough,
  highlight, lists, checklists, quotes, code blocks, and 15 fonts (Inter,
  Roboto, Open Sans, Lato, Montserrat, Poppins, Plus Jakarta Sans, Lora,
  Merriweather, Playfair Display, Source Serif, JetBrains Mono, and the
  Amharic faces Noto Sans Ethiopic, Noto Serif Ethiopic and Abyssinica SIL).
  Every Latin font falls back to a Ge'ez face, so Amharic never shows boxes.
- **Tag** by typing `#tag` (or nested, `#work/meetings`) anywhere in a note.
  Tags fill the sidebar; ⌘-click a tag in a note to see its notes.
- **Find**: search the current list as you type, in Amharic or English; add
  `#tag` to narrow it. Matches are highlighted.
- **Favourite** notes with the star; **trash** them, restore them, or delete
  them for good from the Trash.
- **Speak**: the microphone in the list records a voice note that is
  transcribed into a new note; **Dictate** in a note types your words at the
  cursor after each pause while you keep talking.
- Light and dark themes (or follow the system), under the gear at the bottom
  of the sidebar, beside the microphone and speech-model choices.

Keyboard: ⌘N new note, ⌘F search, ⌘B/⌘I/⌘U bold, italic, underline. Like Bear,
a new note starts with a title heading, and a note's first line is its title
in the list.

The editor is [Tiptap](https://tiptap.dev) 3. The look comes from the
[ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
design system for a notes app ("Minimalism & Swiss", warm ink on paper) with
Bear's red as the accent, and Plus Jakarta Sans for the interface.

Two Amharic speech models run locally on the Python runtime that
[VoiceStudio](https://github.com/debpalash/VoiceStudio) installs; pick one in
settings. VoiceStudio's own speech engine is still available as an option
(below).

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
press **Transcribe again** under a voice note to compare on your own voice
(the bar says which model wrote the text).

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
when you press record or Dictate (a few seconds to load), exits after five
idle minutes, and the other model's helper exits when you switch.

The setup script also corrects BuzzASR's `generation_config.json`, which as
published makes transformers 5.x drop its Whisper settings. The Hugging Face
cache itself is left unchanged.

## Voice notes and dictation

The microphone button above the note list records a **voice note**: after
Stop, the recording is saved as a new note and transcribed into it (the
editor is read-only until the text arrives). The bar under a voice note plays
it back, shows which model wrote the text, and can **Transcribe again** with
the model you pick (it asks first, since that replaces the note's text).

**Dictate** streams the microphone (an AudioWorklet at 16 kHz) through a pause
detector: after 0.5 s of quiet, the speech since the last pause is sent to the
chosen model and its text is typed at the cursor, or at the end of a note you
haven't clicked into. The note keeps the audio of its first dictation, marked
as already transcribed; if a piece couldn't be transcribed, the note says so
and the audio waits for **Transcribe**. Leaving the note stops dictation and
the last words still land in it. The first words wait for the model to load;
after that the text keeps up with speech on either model.

## Run it

```bash
npm install
npm run setup:amharic-model
npm run dev
```

`npm run dev` starts the Next.js renderer on port 3123, rebuilds the Electron
main process on change, and opens the app window. The first recording asks for
microphone access; pick the microphone in settings (the gear at the bottom of
the sidebar) if the default isn't the one you speak into.

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

Notes (one JSON file each, plus a WAV for voice notes) and the model folders
live in the app's data folder, `~/Library/Application Support/Nota` on macOS.

### Coming from "Amharic Speech to Text"

Nota is the same app, renamed. On its first launch it renames the old data
folder (`~/Library/Application Support/Amharic Speech to Text`) to `Nota`, so
the models, recordings and settings come along without copying gigabytes, and
turns each recording into a note (same time, text and audio). The original
`recordings/` folder is left as it was, as a backup. Quit the old app before
starting Nota.

## Checks

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e
```

Unit tests cover the notes repository, the import of old recordings and the
data-folder move, tags, search, the note list's sections, the stores, the model
helper's process handling with a fake helper, the pause detector, and
dictation into a note. The e2e suite builds the app, then drives it with
Chromium's fake microphone and a fake VoiceStudio: writing, tagging,
favouriting, searching, trashing and relaunching; fonts and formatting; voice
note → transcribe → play → relaunch; the engine-offline path; silent
microphones; dictation into a note (with a microphone that speaks in phrases);
and the move from the old app's folder.

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
