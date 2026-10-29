@AGENTS.md

# Nota

Electron desktop app for Amharic notes, modelled on Bear: a sidebar of
sections (Notes, Favorites, Voice notes, Untagged, Trash) and `#tags` written
in the text (nested with `/`), a note list with search, and a Tiptap 3
rich-text editor with a font picker. Notes can be spoken: a recording becomes
a voice note transcribed into its text, and Dictate types words at the cursor
after each pause. The repo folder keeps its old name, amharic-stt.

Notes live in `NotesRepo` (`electron/lib/notes-repo.ts`): one JSON file per
note (`content` HTML for the editor plus `text` for titles, tags and search,
`favorite`, `trashedAt`, optional `audio`) and a WAV beside it. Tags are not
stored; `features/notes/lib/tags.ts` reads them from `text`, for the sidebar
and for the editor's pill decorations alike. The data folder is
`<appData>/Nota`; the first launch renames the pre-Nota folder ("Amharic
Speech to Text": models, recordings, localStorage) and imports its recordings
as notes once (`data-folder.ts`, `legacy-recordings.ts`).

The user picks a speech
model (`ModelId` in `shared/schemas/engine.ts`); main keeps one
`TranscriptionEngine` (`electron/lib/transcription-engine.ts`) per model on
offer:

- `hohe` (default) and `buzzasr`: `AmharicModelEngine` runs
  snapwre/hohe-asr-amharic (wav2vec2-BERT CTC) or BuzzASR/amharic (Whisper
  large-v3 fine-tune) through `electron/python/amharic_transcriber.py` on
  Nota's own Python runtime (`<data>/python`, from `scripts/speech-requirements.txt`;
  `resolvePython` in `config.ts` falls back to `NOTA_PYTHON`, then VoiceStudio's
  runtime). `scripts/setup-amharic-model.sh` builds the runtime and downloads
  the model (`npm run setup:hohe`); the app runs the same script from its
  setup guide (`model-setup.ts`, progress over `SETUP_CHANNEL`). After setup
  everything is offline (the helper runs with `HF_HUB_OFFLINE=1`).
  Using one model releases the other's helper (memory).
- `voicestudio` (only when `STT_ENGINE=voicestudio`, as in e2e):
  `VoiceStudioClient` posts to [VoiceStudio](https://github.com/debpalash/VoiceStudio)'s
  OpenAI-compatible API (`POST :3900/v1/audio/transcriptions`, `language=am`).

Hard-won constraints (see the README for evidence): stock Whisper can't do
Amharic (~193% CER); BuzzASR must decode without timestamps (trained
text-only, which is also why VoiceStudio's engines can't run it) and, on MPS,
in float16 with `attn_implementation="eager"` (SDPA in half precision returns
only end-of-text; bfloat16 drifts; float32 needs 8 GB and swaps on a 16 GB
Mac); its published generation config needs `_from_model_config` removed for
transformers 5.x. Hohe prefixes its output with `[AMH]`, which the helper strips.

A transcription replaces a note's text in main (`setTranscription` →
`transcriptToHtml`); the renderer bumps `textVersions[id]` so the editor
remounts with it. Dictation (`stores/dictation-store.ts`): `lib/pcm-capture.ts`
streams 16 kHz samples from `public/worklets/pcm-capture.js`,
`lib/speech-segmenter.ts` cuts clips at 0.5 s pauses, each clip goes through
`transcribeClip` (nothing stored) and is typed at the editor's cursor
(`lib/insert-dictated.ts`, as a text node, never HTML); Stop keeps the audio
with the note via `attachAudio` if it has none. If the editor closes
mid-dictation, `detach` sends the last words to `appendText` instead. Chromium's
`--use-file-for-fake-audio-capture` yields only silence under Electron, so the
e2e dictation test fakes `getUserMedia` in the page (`e2e/phrases-microphone.ts`).

Design: ui-ux-pro-max's "Minimalism & Swiss" with its notes-app palette (warm
ink on paper) and Bear's red accent; semantic colour tokens in
`src/styles/globals.css` switch for dark mode (`data-theme`, or the system).
Interface font Plus Jakarta Sans; all fonts in `src/lib/fonts.ts`.

The interface speaks English or Amharic (Settings → Language): every word is
in `src/lib/i18n/en.ts` and `am.ts` (same shape, type-checked), read through
`useMessages()` (or `currentMessages()` outside React); the choice lives in
`stores/locale-store.ts`, sets `<html lang>` and is sent to main
(`setLocale`) so the menu bar is rebuilt in it (`shared/keymap-labels.ts`).
Messages main sends are English constants in `shared/messages.ts`; the
renderer shows them through `messages.translate`, which knows them by their
English wording.

Other features and where they live: pin/archive/lock fields on the note
(`shared/schemas/note.ts`, older files default them); locked notes are sealed
by `NoteVault` (scrypt key held in memory, AES-256-GCM; the repo stores only
the title in clear, and `view()` returns the open body while unlocked);
keyboard shortcuts come from one table, `shared/keymap.ts`, which builds the
native menu (`app-menu.ts`, commands sent over `COMMAND_CHANNEL`) and the
shortcuts panel, and the renderer routes each command through
`lib/command-bus.ts` to whichever component owns it; Zen mode is
`html[data-zen]` CSS, and the sidebar folds away with `html[data-sidebar]`
(`use-sidebar.ts`; whichever header sits under the Mac's traffic lights gets
`data-corner` padding); dates go through `lib/format.ts` in the calendar
chosen in Settings (`ethiopian-calendar.ts`, Julian day numbers); a recording
made elsewhere is picked in main (`openAudioFile`, `NOTA_IMPORT_AUDIO` in e2e)
or dropped on the list, decoded and saved like a recording
(`use-note-capture.ts`); Summarize & organize is model-free
(`summarize.ts`, `split-paragraphs.ts`, `suggest-tags.ts`, applied through
`apply-assist.ts`; models considered in `docs/amharic-ai.md`); the setup guide shows on a fresh install
(`onboarding.ts`; e2e sets `NOTA_ONBOARDING=off`). Releases:
`npm run package:mac` / `package:linux` (electron-builder, ad-hoc signed,
`node_modules` excluded since the main bundle is self-contained); the app icon
is `build/icon.png` (`build/icon-mac.png` is the rounded macOS version).

Conventions are carried over from the Dandii app (`~/rz-codes/menged`):
feature folders, one component per folder, Zustand stores, `@/` aliases,
strict TypeScript, typed results instead of thrown errors.

## Layout

```
electron/   main process (Node): window, app:// protocol, IPC handlers,
            transcription engines, notes on disk. Plays the "server" role.
  python/   the model helper (one JSON object per line on stdin/stdout);
            shipped as an extraResource, so it lives outside the asar.
shared/     the IPC contract: channel names, Zod schemas, types. Imported by
            both processes, depends on neither.
src/        Next.js renderer, built as a static export (out/) and loaded over
            app://bundle in production, or from `next dev` on :3123 in dev.
public/     static files served as-is, e.g. the dictation AudioWorklet.
e2e/        Playwright tests that drive the built Electron app.
```

Data flow: component → Zustand store action → `invokeDesktop` (`src/lib/desktop.ts`)
→ `window.desktop` (`electron/preload.ts`) → IPC → `electron/ipc/desktop-handlers.ts`
(Zod-validated) → `NotesRepo` / the chosen model's `TranscriptionEngine`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server + tsup watch + Electron |
| `npm run build` | Static export to `out/` and main/preload bundles to `dist-electron/` |
| `npm start` | Run the built app |
| `npm run typecheck` / `npm run lint` / `npm test` | Checks (all must pass) |
| `npm run test:e2e` | Build, then drive the app with a fake mic and a fake VoiceStudio |
| `npm run package` | Build a distributable with electron-builder |
| `npm run setup:hohe` | Build the speech runtime and download Hohe (`setup:amharic-model -- buzzasr\|all` for the others) |
| `npm run package:mac` / `package:linux` | Release builds in `release/` |

## Rules

Topic rules live in [`.claude/rules/`](.claude/rules); each declares the paths
it applies to.

| Rule file | Covers |
|---|---|
| `feature-structure.md` | `features/<name>/` layout, process boundaries (`src` ↔ `shared` ↔ `electron`) |
| `imports-and-file-organization.md` | `@/`, `@main/`, `@shared/` aliases, named exports, `import type`, one component per file |
| `electron-ipc.md` | the IPC contract, Zod validation, typed results, window and permission hardening |
| `state-management.md` | Zustand stores, derived state, minimal `useState` |
| `server-and-client-components.md` | static export, RSC by default, leaf client components, where data comes from |
| `typescript.md` | strict mode, banned `any`/`never`/`unknown`, discriminated unions |
| `code-quality.md` | SonarQube zero-warnings, cognitive complexity, clean code |
| `forms-and-validation.md` | react-hook-form + Zod when a form appears |
| `routing-and-metadata.md` | App Router file conventions, metadata, `error.tsx` with `retry()` |
| `assets-and-performance.md` | `next/font` (Noto Sans Ethiopic), images, dynamic imports |
| `accessibility.md` | semantic HTML, keyboard access, ARIA, contrast |
| `security-secrets-and-config.md` | env vars read in main only, never in the renderer |
| `security-input-and-output.md` | Zod on all IPC input, bounded sizes, CSP, no transcript text in logs |
| `security-errors-and-dependencies.md` | generic errors, patched dependencies |

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

- Where a file or folder belongs → `nextjs-folder-structure` (in `.claude/skills/`)
- Product ideas/brainstorming → /office-hours
- Architecture → /plan-eng-review
- Design system/plan review → /design-consultation or /plan-design-review
- Bugs/errors → /investigate
- QA/testing app behavior → /qa or /qa-only
- Code review/diff check → /review
- Visual polish → /design-review
- Ship/PR → /ship
- Save progress → /context-save; resume → /context-restore
