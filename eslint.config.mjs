import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      "**/generated/**",
      "src/generated/**",
      "**/.prisma/**",
      "prisma/migrations/**",
      "scripts/**/*.cjs",
      "scripts/**/*.mjs",
      "scripts/**/*.js",
      "test-*.js",
      "*.test.js",
      "*.spec.js",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Downgrade to warnings
      "@typescript-eslint/no-unused-vars": "warn", // Downgrade to warnings
      "react/no-unescaped-entities": "warn", // Downgrade to warnings
      "react-hooks/exhaustive-deps": "warn", // Downgrade to warnings
    },
  },
];

export default eslintConfig;
