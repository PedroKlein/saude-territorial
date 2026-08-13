import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

/**
 * ESLint 9 flat config.
 *
 * `eslint-config-next@16` ships as a flat-config array — spread directly.
 * `typescript-eslint` provides recommended-strict as flat too.
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "supabase/migrations/**",
      "next-env.d.ts",
      "src/lib/supabase/database.types.ts",
    ],
  },
  ...nextConfig,
  ...tseslint.configs.strict,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Domain-field variables intentionally use PT-BR (nomeCompleto, dpp, …)
      // per AGENTS.md naming rule. Turn off the naming-convention lint here.
      "@typescript-eslint/naming-convention": "off",
      // We legitimately snapshot the wall clock for coarse "time ago" labels
      // (SyncBadge, MicroareaMetrics). Recomputing on tick is a display
      // choice we haven't made; when we do, we'll add a useSyncExternalStore
      // ticker and re-enable this rule.
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
