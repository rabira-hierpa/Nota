---
paths:
  - "src/**/*.{ts,tsx}"
  - "electron/**/*.ts"
  - "shared/**/*.ts"
---

# Code Quality & SonarQube Compliance

- **Zero Warnings Policy:** All code must pass `npm run lint` and SonarQube analysis without code smells, security hotspots, or bugs.
- **Cognitive Complexity:** Keep function cognitive complexity low (≤ 15). Break down large functions into smaller, single-responsibility helpers.
- **Clean Code:**
  - No commented-out code or unused variables/imports.
  - No duplicated code blocks, hardcoded secrets, or magic numbers (name them: `SAVE_DELAY_MS`, `TARGET_SAMPLE_RATE`).
  - Always handle promise rejections and clean up event listeners, timers and subscriptions in hooks.
- **Tests:** pure logic in `lib/` and main-process modules get Vitest tests beside them; user flows get a Playwright test in `e2e/`.
