---
paths:
  - "src/**/*.{ts,tsx}"
---

# Forms & Validation

- **Form Architecture:** When a form appears (settings, renaming), use `react-hook-form` integrated with `@hookform/resolvers/zod` and `zod` schemas.
- **Schema Location:** Define Zod schemas alongside components in a `[component].schema.ts` file, or in `shared/schemas/` when the main process validates the same payload.
- **Form State:** Infer TypeScript types directly from Zod schemas using `z.infer<typeof schema>`. Never duplicate type declarations for forms.
- The transcript editor is not a form: it autosaves (debounced) through the store.
