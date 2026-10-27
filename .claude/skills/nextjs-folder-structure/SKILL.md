---
name: nextjs-folder-structure
description: Decide where files and folders belong in a Next.js App Router project. Use whenever the user is creating, moving, refactoring, renaming or reviewing routes, pages, layouts, components, hooks, lib/utils, types or API route handlers, or asks "where should this go", "how should I organize/structure this", "should this be in app/ or components/", route groups, private folders, colocation, or the src/ folder. Use it even when the user doesn't say "folder structure" but is about to add a new page, feature or route and the placement isn't obvious.
---

# Next.js folder structure (App Router)

Next.js is unopinionated about where non-route code lives, but it is strict about what the `app/` directory _means_. Most structure mistakes come from not knowing which of those two worlds a file belongs to. This skill gives you the fixed rules, then a way to decide the flexible ones.

Next's conventions change between major versions. Before relying on anything below for an unfamiliar version, check the docs bundled with the installed package: `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`. Trust those over this file if they disagree.

## Step 0: look before you place anything

1. Find the app root: is there a `src/` folder? Is `app/` inside it? Never create a second `app/` at the other level, because Next only reads one and silently ignores the other.
2. Read the project's own rules first (`CLAUDE.md`, `.claude/rules/`, `AGENTS.md`). Where they set a convention, such as component folder layout or where types live, it wins over the defaults here.
3. Look at how two or three existing, similar files are placed and match them. Consistency beats a "better" layout that nothing else uses.

## The fixed rules (the framework enforces these)

**Folders in `app/` are URL segments.** `app/blog/authors/page.tsx` serves `/blog/authors`.

**A segment is public only if it has `page` or `route`.** A folder with neither is not reachable, which is why you can safely put other files next to routes (colocation).

**Special filenames carry meaning.** Do not use them for anything else, and do not rename them:

| File                     | Purpose                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `layout`                 | Shared UI wrapping the segment and its children (preserved across navigation) |
| `page`                   | The UI that makes the segment a public route                                  |
| `loading`                | Suspense fallback for the segment                                             |
| `error` / `global-error` | Error boundary (must be a Client Component)                                   |
| `not-found`              | Not-found UI                                                                  |
| `route`                  | HTTP handler (API endpoint); cannot sit beside a `page` in the same segment   |
| `template`               | Like layout but re-mounted on navigation                                      |
| `default`                | Fallback for a parallel-route slot                                            |

There are also metadata files (`icon`, `apple-icon`, `opengraph-image`, `sitemap`, `robots`, `manifest`) that Next picks up by name. Full list with extensions: `references/file-conventions.md`.

**Special folder syntax:**

| Syntax                    | Effect on URL                                              | Use for                                                                            |
| ------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `[slug]`                  | one dynamic segment                                        | `/blog/my-post`                                                                    |
| `[...slug]`               | catch-all                                                  | `/docs/a/b/c`                                                                      |
| `[[...slug]]`             | optional catch-all                                         | `/docs` and `/docs/a/b`                                                            |
| `(group)`                 | **omitted** from the URL                                   | organizing routes; giving a subset of routes its own layout or its own root layout |
| `_folder`                 | opts the folder and everything under it **out of routing** | private implementation files next to routes                                        |
| `@slot`                   | none; a named slot rendered by the parent layout           | parallel routes                                                                    |
| `(.)x`, `(..)x`, `(...)x` | none; intercepts another route                             | modals over a list                                                                 |

**Root-level files live at the project root, not in `app/`:** `next.config.*`, `proxy.ts`, `instrumentation.ts`, `.env*`, `tsconfig.json`. With a `src/` folder, `proxy.ts` and `instrumentation.ts` go inside `src/`; config files stay at the root. `public/` always stays at the root.

## The flexible rules (decide, then stay consistent)

Where reusable, non-route code goes. There are three valid strategies; the docs' advice is to pick one and be consistent.

1. **Everything outside `app/`.** `app/` holds only routes; shared code lives in `components/`, `lib/`, `hooks/`, `types/` at the same level. Best default for apps with lots of shared code.
2. **Shared folders inside `app/`.** Same top-level folders, but under `app/`. Fine for small apps; mixes routing and code.
3. **Split by feature or route.** Global code at the shared level, code used by only one route colocated in that route's folder (usually under `_components/`, `_lib/`).

**Deciding for a specific file** — ask in this order:

1. Does Next require it to be here (special file, metadata file, route handler)? Put it there. Done.
2. Is it used by exactly one route (or route subtree)? Colocate it in that segment, inside a private folder (`_components`, `_lib`) so it can never become a route and is obvious to readers.
3. Used by two or more unrelated routes? Move it to the shared location the project already uses.
4. Not sure yet? Start colocated. Promoting a file to shared when a second user appears is a cheap move; untangling something prematurely shared is not.

Private folders are optional for correctness (colocation is already safe without a `page`/`route`) but worth it for readability and to avoid collisions with future Next special filenames.

## Route groups: when to reach for them

- To organize sections without touching URLs: `(marketing)`, `(shop)`, `(auth)`.
- To give some routes a layout others don't: put those routes in a group and add `layout.tsx` to the group.
- To scope `loading.tsx` to one page and not its siblings: put the page and `loading.tsx` in an inner group, e.g. `(overview)`.
- For multiple root layouts: delete the top-level `layout.tsx` and give each group its own that renders `<html>` and `<body>`. Note that navigating between different root layouts triggers a full page load.

Two routes in different groups must not resolve to the same URL (`(a)/about/page.tsx` and `(b)/about/page.tsx` collide).

## Common mistakes to catch

- Putting a component, util or test file at a name Next reserves (e.g. a `page.tsx` that isn't a route page, a helper called `route.ts`).
- Adding `app/` under both the root and `src/`.
- Putting `proxy.ts` or `instrumentation.ts` in `app/` instead of the project/`src` root.
- A `route.ts` and `page.tsx` in the same segment.
- Using a route group name in a link or URL.
- Deep, speculative nesting (`features/x/components/ui/buttons/...`) created before there's more than one file to put in it.

## When you place or move files

State the destination and which rule decided it ("used only by `/console/stops`, so `console/stops/_components/`"). When moving a file, update imports and re-check that no route's URL changed unintentionally; if the project uses path aliases, use them in the new imports.
