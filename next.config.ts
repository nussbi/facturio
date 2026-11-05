import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We deploy via `next start` on the server, so do not use standalone output
  // Externalize server-only packages so __dirname and file access work correctly (avoids /ROOT path issues)
  serverExternalPackages: ["pdfkit", "swissqrbill", "@prisma/client", ".prisma/client"],
  experimental: {
    // Cap build-worker parallelism: this sandbox's cgroup allows 512 pids/threads,
    // and on 64 cores Next spawns ~63 worker processes -> `spawn /usr/local/bin/node EAGAIN`.
    cpus: 6,
  },
  typescript: {
    // Temporarily ignore type errors during production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Don't block production builds on ESLint warnings/errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
