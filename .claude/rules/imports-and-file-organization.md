---
paths:
  - "src/**/*.{ts,tsx}"
  - "electron/**/*.ts"
  - "shared/**/*.ts"
---

# Imports & File Organization

- **No parent-relative imports.** Never `../`. Use the aliases: `@/` → `src/`, `@main/` → `electron/`, `@shared/` → `shared/`. Same-folder `./` is fine (component `index.ts` re-exports). ESLint enforces this.
- **No Default Exports:** Always use **Named Exports** for components, utilities, and hooks. Exception: Next.js special files (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`) where Next.js requires default exports.
- **Type Imports:** Always mark type imports as `import type { ... }`.
- **One component per file — no exceptions.** Every component gets its own folder:

  ```
  src/features/notes/components/audio-bar/
    audio-bar.tsx           # the component, named export
    audio-bar.types.ts      # props + local types (only if non-trivial)
    index.ts                # re-export
  ```

  If a file's second component exists only to keep a `useEffect` local, that is a hook, not a component — extract it to the feature's `hooks/`.

- **Types live in a `types/` folder, one domain per file.** IPC types in `shared/types/` (`note.ts`, `engine.ts`); renderer types shared across features in `src/types/`; one feature's types in `src/features/<name>/types/`. Only a component's own props stay beside it.
  - Types derived from a schema are never re-declared by hand — infer them (`z.infer`) and re-export from the types folder.
