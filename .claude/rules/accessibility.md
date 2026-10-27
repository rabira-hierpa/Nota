---
paths:
  - "src/**/*.tsx"
---

# Accessibility (a11y) & Semantic HTML

- **Semantic Tags:** Use proper HTML tags (`<main>`, `<aside>`, `<nav>`, `<header>`, `<footer>`, `<section>`, `<button>`).
- **Interactive Elements:** Non-interactive tags (`div`, `span`) must never have `onClick` listeners unless wrapped in accessible button roles with keyboard handlers. Never nest one button inside another.
- **ARIA & Contrast:** Every input has an associated `<label>` (visually hidden with `sr-only` if needed), icon-only buttons have `aria-label`, live status uses `role="status"`/`aria-live`, and color contrast meets WCAG AA.
- **Language:** mark Amharic content with `lang="am"` so screen readers switch voice.
