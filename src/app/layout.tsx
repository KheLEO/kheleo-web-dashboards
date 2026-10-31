import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KheLEO · Athlete Intelligence & Talent Network", template: "%s | KheLEO" },
  description:
    "Grassroots sports intelligence with permanent verified identity, GTI ratings, and anti-sandbagging competition brackets.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="kheleo-gold-crimson" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased selection:bg-primary/25">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:p-3 focus:font-semibold focus:text-primary-foreground focus:shadow-xl"
        >
          Skip to content
        </a>
        <ThemeProvider defaultTheme="kheleo-gold-crimson">
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
