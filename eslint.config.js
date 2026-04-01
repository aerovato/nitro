import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map(
  config => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  }),
);

export default defineConfig(
  eslint.configs.recommended,
  ...typeCheckedConfigs,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/no-unescaped-entities": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "ink",
              importNames: ["Text"],
              message: "Use CustomText.tsx instead.",
            },
            {
              name: "ink",
              importNames: ["render"],
              message: "Use renderWithColor() from utils.ts instead.",
            },
            {
              name: "ink-text-input",
              importNames: ["default"],
              message: "Use CustomTextInput.tsx instead.",
            },
          ],
        },
      ],
    },
    settings: {
      react: {
        version: "19.0",
      },
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "internal/**",
      "__mocks__/**",
      "vitest.config.ts",
    ],
  },
);
