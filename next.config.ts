import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      // KLIPY (GIF)
      { protocol: "https", hostname: "static.klipy.com" },
      { protocol: "https", hostname: "static1.klipy.com" },
      { protocol: "https", hostname: "static2.klipy.com" },
      // Tenor (قدیمی — در صورت اجرای موازی)
      { protocol: "https", hostname: "media.tenor.com" },
      { protocol: "https", hostname: "c.tenor.com" },
      // Supabase Storage (media/avatars)
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
