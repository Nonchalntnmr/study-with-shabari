import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { ChatWidget } from "@/components/site/chat-widget";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE_NAME, siteUrl } from "@/lib/site";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Exam passages and questions use a typeface designed for reading accuracy.
const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });

// Only the production deployment may be indexed; previews and local builds stay out of search.
const indexable = (process.env.VERCEL_ENV ?? process.env.SITE_ENV) === "production";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${SITE_NAME} — MCAT tutoring from a 522 scorer`, template: `%s · ${SITE_NAME}` },
  description:
    "Free MCAT notes, original practice sets, and 1:1 MCAT tutoring from Shabari Shankar, who scored 522 on the MCAT in January 2026.",
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url: "/" },
  twitter: { card: "summary_large_image" },
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#10254b",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${atkinson.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <TooltipProvider delayDuration={300}>
          {/* Safety net for any segment that reads the request at the top of a layout. */}
          <Suspense fallback={<div className="flex-1" />}>{children}</Suspense>
        </TooltipProvider>
        <Toaster position="bottom-center" />
        <ChatWidget />
      </body>
    </html>
  );
}
