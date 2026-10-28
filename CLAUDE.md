@AGENTS.md

# Amharic Speech to Text

Electron desktop app: record your voice, get Amharic text, edit it, play it
back, or dictate and watch the text appear after each pause. The user picks a
model (`ModelId` in `shared/schemas/engine.ts`); main keeps one
`TranscriptionEngine` (`electron/lib/transcription-engine.ts`) per model on
offer:

- `hohe` (default) and `buzzasr`: `AmharicModelEngine` runs
  snapwre/hohe-asr-amharic (wav2vec2-BERT CTC) or BuzzASR/amharic (Whisper
  large-v3 fine-tune) through `electron/python/amharic_transcriber.py` on
  VoiceStudio's installed Python runtime. Set up with `npm run setup:amharic-model`.
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

Dictation (`stores/dictation-store.ts`): `lib/pcm-capture.ts` streams 16 kHz
samples from `public/worklets/pcm-capture.js`, `lib/speech-segmenter.ts` cuts
clips at 0.5 s pauses, each clip goes through `transcribeClip` (nothing
stored), and Stop saves the recording with `dictated` text. Chromium's
`--use-file-for-fake-audio-capture` yields only silence under Electron, so the
e2e dictation test fakes `getUserMedia` in the page (`e2e/phrases-microphone.ts`).

Conventions are carried over from the Dandii app (`~/rz-codes/menged`):
feature folders, one component per folder, Zustand stores, `@/` aliases,
strict TypeScript, typed results instead of thrown errors.

## Layout

```
electron/   main process (Node): window, app:// protocol, IPC handlers,
            transcription engines, recordings on disk. Plays the "server" role.
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
(Zod-validated) → `RecordingsRepo` / the chosen model's `TranscriptionEngine`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server + tsup watch + Electron |
| `npm run build` | Static export to `out/` and main/preload bundles to `dist-electron/` |
| `npm start` | Run the built app |
| `npm run typecheck` / `npm run lint` / `npm test` | Checks (all must pass) |
| `npm run test:e2e` | Build, then drive the app with a fake mic and a fake VoiceStudio |
| `npm run package` | Build a distributable with electron-builder |
| `npm run setup:amharic-model [-- hohe\|buzzasr]` | Download the pinned models and build their folders |

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
