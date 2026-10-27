---
paths:
  - "src/app/**/*"
---

# Routing, Metadata, & Error Boundaries

- **App Directory Conventions:** Keep layouts, loading states, error boundaries, and pages cleanly separated (`layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`). Every route must be statically exportable (no dynamic routes without `generateStaticParams`).
- **Metadata API:** Export a static `metadata` object from every page.
- **Error Boundaries:** Every `error.tsx` must be a Client Component (`"use client"`) with a recover option. In Next 16.4 the prop is `retry()` (not `reset()`); check `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`.
