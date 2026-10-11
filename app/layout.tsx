import type { Metadata } from "next";
import "./globals.css";
import { ThemeSync } from "@/components/theme-sync";
import { CloudDataSync } from "@/components/cloud-data-sync";

export const metadata: Metadata = {
  title: "AssistMyDay",
  description: "A warm place for your family’s everyday life",
  applicationName: "AssistMyDay",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AssistMyDay" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className="app-themed min-h-screen bg-[#F7F8FA] antialiased dark:bg-slate-950 dark:text-slate-100"
        style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}
      >
        <ThemeSync />
        <CloudDataSync />
        {children}
      </body>
    </html>
  );
}
