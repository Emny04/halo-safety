import type { NextConfig } from "next";

const extraDevOrigins = (process.env.NEXT_PUBLIC_EXTRA_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...extraDevOrigins,
    "right-cycadaceous-rubi.ngrok-free.dev",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
