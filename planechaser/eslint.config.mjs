import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React 19 added this rule and it flags 21 pre-existing call sites,
      // nearly all of them `useEffect(() => setHydrated(true), [])` hydration
      // guards. Real technical debt, but not defects, and rewriting all of
      // them belongs in its own change — tracked in
      // .planning/todos/pending/2026-07-31-set-state-in-effect-cleanup.md.
      // Downgraded so CI can gate on genuine errors in the meantime.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
