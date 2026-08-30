import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  devIndicators: false,  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Real uploaded media: publicUrl() in server/services/storage.ts
        // builds res.cloudinary.com URLs, and every article cover /
        // media-library thumbnail renders through next/image with that
        // URL as `src` — without this, next/image rejects the hostname
        // and every non-seed cover image breaks in production.
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Baseline hardening only — not a full CSP. A strict CSP would need
  // auditing every inline script (TipTap, Next's own hydration) first;
  // these four are safe-by-default and never break anything.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
