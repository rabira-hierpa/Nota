# Next.js App Router file conventions (reference)

Source: the project-structure guide bundled with Next (`node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`). Re-verify against the installed version.

## Top-level folders

| Folder | Purpose |
|---|---|
| `app` | App Router |
| `pages` | Pages Router (legacy; can coexist during migration) |
| `public` | Static assets served as-is |
| `src` | Optional wrapper for application code (`app`, `components`, `lib`, ...) |

## Top-level files

| File | Purpose |
|---|---|
| `next.config.js` / `.mjs` / `.ts` | Next.js configuration |
| `package.json` | Dependencies and scripts |
| `instrumentation.ts` | OpenTelemetry / instrumentation (inside `src/` if you use `src/`) |
| `proxy.ts` | Request proxy (inside `src/` if you use `src/`) |
| `.env`, `.env.local`, `.env.production`, `.env.development` | Environment variables; don't commit secrets |
| `eslint.config.mjs` | ESLint config |
| `tsconfig.json` / `jsconfig.json` | Compiler config |
| `next-env.d.ts` | Generated TS declarations; don't track in git |

## Routing files (extensions `.js` `.jsx` `.tsx`; `route` is `.js` `.ts`)

`layout`, `page`, `loading`, `not-found`, `error`, `global-error`, `route`, `template`, `default`.

## Metadata files

| Group | Files |
|---|---|
| App icons | `favicon.ico`, `icon` (`.ico .jpg .jpeg .png .svg`, or generated `.js .ts .tsx`), `apple-icon` (`.jpg .jpeg .png`, or generated) |
| Social images | `opengraph-image`, `twitter-image` (`.jpg .jpeg .png .gif`, or generated `.js .ts .tsx`) |
| SEO | `sitemap` (`.xml`, or generated `.js .ts`), `robots` (`.txt`, or generated `.js .ts`) |

(`manifest` is also picked up by name; confirm its current extensions in the installed docs.)

## Render hierarchy within a segment (outermost first)

`layout` → `template` → `error` (error boundary) → `loading` (suspense boundary) → `not-found` (boundary) → `page` or nested `layout`.

Child segments render inside their parent's components.

## Example: feature-split layout with private folders and groups

```
src/
  app/
    (marketing)/
      layout.tsx          # layout only for marketing pages
      page.tsx            # /
      pricing/page.tsx    # /pricing
    (app)/
      layout.tsx          # authenticated shell
      dashboard/
        page.tsx          # /dashboard
        loading.tsx
        _components/      # used only by /dashboard, never routable
          stats-card.tsx
        _lib/
          queries.ts
      settings/page.tsx   # /settings
    api/
      health/route.ts     # GET /api/health
    layout.tsx            # root layout (<html>, <body>)
    not-found.tsx
  components/             # shared across routes
  lib/                    # shared non-UI code
  hooks/
  types/
  proxy.ts
public/
next.config.ts
```
