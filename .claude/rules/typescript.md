---
paths:
  - "src/**/*.{ts,tsx}"
  - "electron/**/*.ts"
  - "shared/**/*.ts"
---

# Strict TypeScript Discipline

- **Strict Mode:** TypeScript strict mode must be enabled and non-negotiable.
- **Forbidden Types:** Absolute ban on `any`, `never`, and `unknown` types. Parse untrusted values with Zod instead of typing them `unknown`.
- **Type Precision:**
  - Define explicit interfaces or types for all component props, IPC payloads, and data structures.
  - Use Discriminated Unions for state objects with multiple mutually exclusive states.
  - Utilize generic constraints (`T extends Record<string, string>`) when writing reusable generics.
