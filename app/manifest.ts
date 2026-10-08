import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AssistMyDay",
    short_name: "AssistMyDay",
    description: "A private family space for plans, health, and everyday moments.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#059669",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
