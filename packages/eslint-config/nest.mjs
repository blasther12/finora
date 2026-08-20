import { baseConfig } from "./base.mjs";

const nestConfig = [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      // Nest usa decorators e injeção por construtor extensivamente.
      // DTOs usados em parâmetros decorados precisam existir em runtime para
      // que o TypeScript emita os metadados consumidos pelo ValidationPipe.
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.e2e-spec.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default nestConfig;
