---
paths:
  - "src/**/*.{ts,tsx}"
---

# State Management & Hooks

- **Minimize `useState`:** Do NOT use `useState` for values that can be derived or stored elsewhere (a store, the URL).
- **Derived State:** Calculate values during rendering rather than storing derived data in state or sync-effects.
- **Optimization:** Use `useMemo` for expensive computations and `useCallback` for callbacks passed down to memoized children or into hooks.
- **Zustand owns state.** All non-trivial client state lives in a Zustand store (`features/<name>/stores/`, or `@/stores` when several features share it). A component may keep `useState` only for state that is genuinely local and disposable — an uncontrolled input's save indicator, a "Copied" flag, a player's playback position mirrored from its own `<audio>` element. The moment a second component needs a value, it belongs in a store.
  - One store per domain (`recordings-store.ts`, `engine-store.ts`), not one global store.
  - Select narrowly (`useRecordingsStore((s) => s.selectedId)`) so a write to one slice doesn't re-render every consumer.
  - Use discriminated unions for multi-state values (`LoadState`, `RecorderState`, `EngineState`).
- **Data from the main process** is loaded by store actions, triggered once from a feature hook (`use-load-recordings.ts`, `use-engine-polling.ts`). Components never call `window.desktop`.
- **Clean up** every timer, listener and object URL a hook or store creates.
