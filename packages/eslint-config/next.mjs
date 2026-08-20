import { FlatCompat } from "@eslint/eslintrc";
import { baseConfig } from "./base.mjs";

// Resolve o preset e seus plugins a partir da aplicação consumidora. Isso
// mantém o preset compartilhado compatível com o isolamento de dependências do pnpm.
const compat = new FlatCompat({
  baseDirectory: process.cwd(),
  resolvePluginsRelativeTo: process.cwd(),
});

const nextConfig = [...compat.extends("next/core-web-vitals"), ...baseConfig];

export default nextConfig;
