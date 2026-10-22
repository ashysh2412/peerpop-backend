import type { MetadataRoute } from "next";

// Lets phones add Peerpop to the home screen as an app, and is the base for the store apps.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Peerpop",
    short_name: "Peerpop",
    description: "Find creators to collab with, connect, and team up on your next shoot.",
    start_url: "/home",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#f0b100",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
