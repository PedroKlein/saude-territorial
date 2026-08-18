import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

/**
 * `eslint-config-next@16` ships as a flat-config array. `typescript-eslint`
 * provides `strictTypeChecked` + `stylisticTypeChecked`: the strictest
 * recommended sets, both type-aware. Type-aware rules need a TypeScript
 * program, enabled via `projectService`. Lint runs on `src/` only (see
 * package.json), and every `src` file is covered by tsconfig.json.
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
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Domain-field variables intentionally use PT-BR (nomeCompleto, dpp, …)
      // per AGENTS.md naming rule.
      "@typescript-eslint/naming-convention": "off",
      // We legitimately snapshot the wall clock for coarse "time ago" labels
      // (SyncBadge, MicroareaMetrics). Recomputing on tick is a display choice
      // we haven't made; when we do we'll add a useSyncExternalStore ticker.
      "react-hooks/purity": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Numbers (and bigints) in template literals are idiomatic and safe;
      // the strict default forbids them, which is noise, not a quality win.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      // Prefer `type` aliases over `interface`: the codebase is written that
      // way, and interfaces lack the implicit index signature that structural
      // `Record<string, unknown>` parameters expect.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "src/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      // Fixtures and mocks routinely traffic in loosely-typed values and call
      // unbound methods; the type-aware safety rules are noise there.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/unbound-method": "off",
    },
  },
);
