import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { MotionFlag } from "@/components/motion/MotionFlag";
import { competition, hero } from "@/content/competition";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${competition.name} — ${competition.school}`,
    template: `%s — ${competition.name}`,
  },
  description: hero.supporting,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1b1c1e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline MotionFlag script adds classes to <html> before hydration.
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <body>
        <MotionFlag />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <Suspense>
          <SmoothScroll />
        </Suspense>
        <div id="main" tabIndex={-1} className="outline-none">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
