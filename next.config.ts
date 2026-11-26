import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "placeholder.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
  // Sign-up no longer has its own screen: people land on the feed and edit their profile when they like.
  // Basic browser safety settings for every page. No Content-Security-Policy on purpose:
  // the Google sign-in button and Meta Pixel load outside scripts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [{ source: "/onboarding", destination: "/settings/profile", permanent: false }];
  },
  // The Instagram post images are drawn with these fonts at request time.
  outputFileTracingIncludes: { "/ig/[id]": ["./assets/fonts/*.ttf", "./public/logo.png", "./public/characters/*.svg"] },
  cacheComponents: true,
  partialPrefetching: true,
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
