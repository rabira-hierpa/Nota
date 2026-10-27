---
paths:
  - "electron/**/*.ts"
  - "shared/**/*.ts"
  - "src/**/*.{ts,tsx}"
---

# Security: Input Validation, Data Integrity & Output Safety

Assume every IPC message is hostile and every renderer value is untrusted. Fail closed.

## Input validation & data integrity

- **Validate everything with Zod.** Every IPC handler parses its payload against a `shared/schemas` schema before use and rejects unknown keys or oversized input.
- **Bound everything.** Audio bytes, recording length and transcript length are capped in `shared/schemas/recording.ts`; ids are UUIDs, so they can never form a path.
- **Never build file paths from raw input.** Files are addressed by validated id; the static server refuses paths outside `out/`.
- **Atomic, serialized writes.** `RecordingsRepo` queues operations and writes the index via temp-file + rename.
- **Validate what comes back too.** VoiceStudio responses are parsed with Zod before use.

## Output & injection safety

- **Trust React's escaping.** Never `dangerouslySetInnerHTML` with user or engine content.
- **Security headers.** Keep the CSP, `X-Content-Type-Options` and `Referrer-Policy` set in `electron/lib/app-protocol.ts`.
