import type { Metadata } from "next";
import "./globals.css";
import { ThemeSync } from "@/components/theme-sync";

export const metadata: Metadata = {
  title: "AssistMyDay",
  description: "A warm place for your family’s everyday life",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
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
        {children}
      </body>
    </html>
  );
}
