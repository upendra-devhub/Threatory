import type { NextConfig } from "next";

const DEFAULT_API_ORIGIN = "http://localhost:4000";

function getApiOrigin(): string {
  const configured = process.env.API_ORIGIN?.trim();
  if (!configured) {
    return DEFAULT_API_ORIGIN;
  }
  return configured.replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
  async rewrites() {
    const apiOrigin = getApiOrigin();
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
