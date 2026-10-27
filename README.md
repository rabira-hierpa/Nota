# ድምፅ ወደ ጽሑፍ · Amharic Speech to Text

A small desktop app: press **New recording**, speak Amharic, press **Stop**, and
the text appears ready to edit. Recordings are listed on the left; the
transcript and playback controls are on the right. Everything stays on your
machine.

Transcription is done by [VoiceStudio](https://github.com/debpalash/VoiceStudio)
running locally. The app sends each recording (16 kHz mono WAV) to VoiceStudio's
OpenAI-compatible endpoint with `language=am`.

## Requirements

- Node.js 22+
- VoiceStudio 0.5.7+ running, with its backend on `http://127.0.0.1:3900`
- A **multilingual Whisper** speech-recognition model active in VoiceStudio.
  `faster-whisper` or `mlx-whisper` with **large-v3** handles Amharic best.
  English-only engines (Parakeet, Moonshine, `.en` models) will not work.

The sidebar footer shows whether VoiceStudio is reachable. If no
speech-recognition model is installed, the app says so after the first
recording.

## Run it

```bash
npm install
npm run dev
```

`npm run dev` starts the Next.js renderer on port 3123, rebuilds the Electron
main process on change, and opens the app window. The first recording asks for
microphone access.

To run the production build instead:

```bash
npm run build && npm start
```

To make a distributable (`release/`):

```bash
npm run package
```

## Configuration

Copy `.env.example` to `.env` to point at a VoiceStudio on another machine:

| Variable | Default | Purpose |
|---|---|---|
| `VOICESTUDIO_URL` | `http://127.0.0.1:3900` | VoiceStudio speech API |
| `OMNIVOICE_API_KEY` | (none) | Bearer key for a remote VoiceStudio |

Recordings and transcripts are stored in the app's user-data folder
(`~/Library/Application Support/Amharic Speech to Text/recordings` on macOS).

## Checks

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e
```

The e2e suite builds the app, then drives it with Chromium's fake microphone
and a fake VoiceStudio, covering record → transcribe → edit → play → relaunch,
and the VoiceStudio-offline path.

## How it is built

Electron main process (`electron/`) + Next.js static export renderer (`src/`),
sharing a Zod-validated IPC contract (`shared/`). File organisation and
architecture follow the Dandii app's rules; see [CLAUDE.md](CLAUDE.md) and
[`.claude/rules/`](.claude/rules).
