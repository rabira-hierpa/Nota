---
paths:
  - "src/**/*.tsx"
---

# Assets & Optimization

- **Fonts:** Load fonts with `next/font` so they are self-hosted and work offline. **Noto Sans Ethiopic** renders every piece of Amharic text: give Ge'ez content `lang="am"` and the `font-ethiopic` utility (Noto first, Inter as Latin fallback). Inter has no Ge'ez glyphs.
- **Images:** Use `next/image` with `unoptimized` (static export has no image optimizer). Every image needs explicit `width`/`height` or `fill`, an informative `alt`, and `priority` when above the fold.
- **Icons:** `@untitledui/icons`, `aria-hidden` when next to a text label; icon-only buttons get `aria-label`.
- **Dynamic Imports:** Use `next/dynamic` or `React.lazy` to code-split heavy client libraries or dialogs.
