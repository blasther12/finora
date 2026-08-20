import { baseConfig } from "./base.mjs";

const nestConfig = [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      // Nest usa decorators e injeção por construtor extensivamente.
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
