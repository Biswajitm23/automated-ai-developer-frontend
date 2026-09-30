import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The dev-only mock (src/lib/mock) must never reach a production bundle. Its
// one entry point is the guarded dynamic import() in src/lib/services/http.ts,
// which the bundler drops in production builds. A static import anywhere would
// pull the mock and its seed data into the bundle, so it is a lint error.
const MOCK_IMPORT_MESSAGE =
  "The dev-only mock is loaded only through the guarded dynamic import() in src/lib/services/http.ts. Do not import it elsewhere.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    ignores: ["src/lib/mock/**"],
    rules: {
      // Static imports and re-exports: forbidden everywhere outside the mock,
      // http.ts included (it uses import(), which this rule does not check).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/lib/mock", "@/lib/mock/*"], message: MOCK_IMPORT_MESSAGE },
            // The same folder reached by a relative or src-rooted path.
            { regex: "^(?!@/)(.*/)?lib/mock(/|$)", message: MOCK_IMPORT_MESSAGE },
            { regex: "^(\\./|(\\.\\./)+)mock(/|$)", message: MOCK_IMPORT_MESSAGE },
          ],
        },
      ],
    },
  },
  {
    // Dynamic import() of the mock: only the guarded one in http.ts.
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    ignores: ["src/lib/mock/**", "src/lib/services/http.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportExpression[source.value=/(^@\\u002Flib\\u002Fmock|(^|\\u002F)lib\\u002Fmock|^(\\.\\u002F|(\\.\\.\\u002F)+)mock)(\\u002F|$)/]",
          message: MOCK_IMPORT_MESSAGE,
        },
      ],
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
