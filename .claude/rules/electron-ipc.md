---
paths:
  - "electron/**/*.ts"
  - "shared/**/*.ts"
  - "src/lib/desktop.ts"
  - "src/features/**/stores/*.ts"
---

# Electron IPC & Hardening

The main process is this app's server. IPC handlers take the place of Dandii's Server Actions and follow the same contract.

## The contract

- **One source of truth.** `shared/types/desktop-api.ts` declares every call; `shared/ipc-channels.ts` names a channel per method (`satisfies Record<keyof DesktopApi, string>` keeps them in lockstep). Add a call by extending both, then the preload, then the handler.
- **Validate every payload with Zod** in `electron/ipc/desktop-handlers.ts`, even though it is typed: it arrived from another process. Schemas live in `shared/schemas/` and are `.strict()` with size bounds.
- **Typed results, never throws.** Every call resolves to `Result<T>` (`{ success: true, data } | { success: false, error }`). Errors are short, human, and non-revealing; log the detail in main.
- **Domain failures are state, not errors.** A failed transcription is stored on the note (`audio.transcription.status = "error"`); the IPC call still succeeds.
- **Renderer side:** only store actions call `invokeDesktop`; components never touch `window.desktop`.
- **Optimistic UI** for edits: update the store first, then persist (see `saveContent`). A reply to a favourite, trash or audio change must not overwrite text the editor saved after the request went out (`mergeReply` in `notes-store.ts`).

## Hardening (do not relax)

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. The preload is a thin pass-through bundled by tsup.
- Handlers answer only senders whose frame origin is the app's own (`app://bundle`, or the dev server).
- Navigation off-origin and `window.open` are denied.
- The only permission granted is audio-only `media` for the app's own origin.
- Production pages are served from `out/` over `app://` with a CSP (`electron/lib/app-protocol.ts`); path resolution refuses anything outside `out/`.
- The renderer never calls the network. VoiceStudio is reached from main only.
