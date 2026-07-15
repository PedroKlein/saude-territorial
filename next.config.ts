import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 (used by Better Auth) needs to be treated as external
  // in serverless environments. Vercel handles this automatically.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
