---
paths:
  - "src/**/*.tsx"
---

# Server vs. Client Components

The renderer is a Next.js **static export** (`output: "export"`): Server Components render once at build time, and there is no Next server at runtime. Server Actions, Route Handlers, cookies and `proxy.ts` are unavailable; the Electron main process fills that role over IPC (see `electron-ipc.md`).

- **Server Components by Default:** Keep components as RSC unless interactivity (event handlers, state, hooks, stores) is strictly required. `page.tsx` and layout-only components such as `recordings-sidebar` stay server components.
- **Leaf-Node Client Components:** Push `"use client"` down to the smallest components that need it.
- **No ad-hoc fetching in components.** Runtime data comes from the main process through store actions (`state-management.md`), never from `fetch` or `window.desktop` inside a component effect.
