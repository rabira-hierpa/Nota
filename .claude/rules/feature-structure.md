---
paths:
  - "src/**/*.{ts,tsx}"
  - "electron/**/*.ts"
  - "shared/**/*.ts"
---

# Feature-based structure

Code is organised by feature, not by technical type (Feature-Sliced Design style, as in Dandii).

```
electron/                 # main process: the "server". Node APIs live only here.
  main.ts  preload.ts
  ipc/                    # handlers behind window.desktop (validated, typed results)
  lib/                    # main-process modules, unit-tested (repo, VoiceStudio client, protocol)
shared/                   # the IPC contract both processes import
  ipc-channels.ts  schemas/  types/
src/
  app/                    # routing only: pages, layouts. Composes features.
  features/<name>/        # one folder per product feature (transcriber, ...)
    components/<name>/    # one component per folder: <name>.tsx, <name>.types.ts, index.ts, <name>.test.tsx
    hooks/                # feature hooks (use-*.ts)
    stores/               # Zustand stores owned by the feature (*-store.ts)
    lib/                  # pure feature logic (no React), unit-tested
    types/                # types used only inside the feature
  components/ hooks/ stores/ lib/ utils/ types/   # shared, feature-agnostic renderer code
```

## Boundaries

- **Process boundaries are enforced by ESLint.** `src/` never imports `@main/*` or `electron`; `electron/` never imports `@/*`; `shared/` imports neither. The renderer reaches the main process only through `invokeDesktop` (`@/lib/desktop`).
- **Imports flow one way:** `app` → `features` → shared renderer code. Shared code never imports from a feature.
- **No cross-feature imports.** If two features need something, it moves to shared.
- **Public API = the component folder's `index.ts`.** Import `@/features/transcriber/components/audio-player`, never `.../audio-player/audio-player`. No feature-wide barrels.
- **Where a type lives:** crosses the IPC boundary → `shared/types` (inferred from `shared/schemas`). Renderer-only and used by several features → `@/types`. One feature → that feature's `types/`.
- **Start colocated, promote on the second user.** Do not create shared code for a single consumer.
