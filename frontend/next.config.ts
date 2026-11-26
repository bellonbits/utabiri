import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // self-contained server for Docker
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
  // When BACKEND_ORIGIN is set (or defaulting to http://api:8000), proxy /backend/* to the
  // FastAPI server so the browser only ever sees this site's HTTPS origin.
  // Pair with NEXT_PUBLIC_API_URL=/backend.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || "http://api:8000";
    return [{ source: "/backend/:path*", destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
