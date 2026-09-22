import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@electric-sql/pglite"],
  output: "standalone",
};

export default nextConfig;
