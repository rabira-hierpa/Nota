---
paths:
  - "electron/**/*.ts"
  - "src/**/*.{ts,tsx}"
  - "package.json"
---

# Security: Errors & Dependencies

- **Generic errors to the renderer.** Return typed, non-revealing `Result` errors; never leak stack traces or file-system paths. Engine guidance (e.g. "install a Whisper model") is fine; internals are not.
- **Patched, vetted dependencies.** Keep `npm audit` at zero; pin `next`, `react` and `electron` deliberately; review new deps for supply-chain risk. Bump Electron promptly — it ships Chromium security fixes.
