import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

// Parent-relative (../) import strings are banned everywhere; use an alias.
// (no-restricted-imports checks the source string, not the resolved path.)
const noParentImports = {
  regex: "^\\.\\./",
  message: "Use the @/, @main/ or @shared/ alias instead of ../ imports (.claude/rules/imports-and-file-organization.md).",
};

const restrictImports = (patterns, paths = []) => [
  "error",
  { patterns: [noParentImports, ...patterns], paths },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Standards from CLAUDE.md enforced on our own source.
  {
    files: ["src/**/*.{ts,tsx}", "electron/**/*.ts", "shared/**/*.ts"],
    plugins: { sonarjs },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "sonarjs/cognitive-complexity": ["warn", 15],
    },
  },
  // Process boundaries (.claude/rules/feature-structure.md): the renderer
  // reaches the main process only through window.desktop; shared/ is the
  // contract and depends on neither side.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictImports(
        [{ regex: "^@main/", message: "The renderer talks to the main process through window.desktop (@/lib/desktop), never by import." }],
        [{ name: "electron", message: "The renderer is sandboxed; use window.desktop (@/lib/desktop)." }],
      ),
    },
  },
  {
    files: ["electron/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictImports([
        { regex: "^@/", message: "Main-process code must not import renderer code; move shared contracts to @shared/." },
      ]),
    },
  },
  {
    files: ["shared/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictImports(
        [{ regex: "^@(main)?/", message: "shared/ is the IPC contract and depends on neither process." }],
        [{ name: "electron", message: "shared/ must stay runtime-agnostic." }],
      ),
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "dist-electron/**",
    "release/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
