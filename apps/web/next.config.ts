import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@finora/shared"],
  async rewrites() {
    const api = process.env.INTERNAL_API_URL ?? "http://localhost:3001/api/v1";
    return [{ source: "/api/v1/:path*", destination: `${api}/:path*` }];
  },
};
export default config;
