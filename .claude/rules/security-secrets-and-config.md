---
paths:
  - "electron/**/*.ts"
  - "src/**/*.{ts,tsx}"
  - ".env*"
---

# Security: Secrets & Configuration

Assume every IPC message is hostile and every renderer value is untrusted. Fail closed.

- **No hardcoded secrets.** Read credentials (e.g. `OMNIVOICE_API_KEY`) from `process.env` in the main process only (`electron/lib/config.ts`). Keep `.env*` out of git; ship only `.env.example`.
- **The renderer gets no config.** Never use `NEXT_PUBLIC_` for anything sensitive; the renderer has no reason to know engine URLs or keys.
- **Never log or return secrets or PII.** Transcripts and audio are personal: keep them out of logs and error messages.
