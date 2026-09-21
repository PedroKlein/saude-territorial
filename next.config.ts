import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 (used by Better Auth) needs to be treated as external
  // in serverless environments. Vercel handles this automatically.
  serverExternalPackages: ["better-sqlite3"],

  // Produces a self-contained server.js in .next/standalone — used by the
  // production Dockerfile to build a minimal image without full node_modules.
  output: "standalone",
};

export default nextConfig;
