import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ["dist/**", "node_modules/**", "*.js"],
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_"
            }],
            "@typescript-eslint/no-require-imports": "off",
            "no-console": "off",
            "prefer-const": "warn",
            "no-empty": ["error", { "allowEmptyCatch": true }],
        },
    }
);

