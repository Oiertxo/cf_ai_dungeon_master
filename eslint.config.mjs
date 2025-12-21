// eslint.config.mjs
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // 1. Target files
  { files: ["**/*.{js,mjs,cjs,ts,tsx}"] },
  
  // 2. Define environment (Browser + Node)
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  
  // 3. Use recommended configurations
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  
  // 4. Custom Rules
  {
    rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { 
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }
        ],
        "no-console": "off" // We use console.log/error for Cloudflare logging
    }
  },
  
  // 5. Ignore build artifacts
  { ignores: ["dist/*", ".wrangler/*", "node_modules/*"] }
];