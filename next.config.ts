import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const https = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

// Third parties are limited to what the site actually embeds:
// Calendly (booking iframe), the IONOS AI Chat widget, Supabase Storage images, Sentry.
// The IONOS widget's own network needs aren't documented: if it misbehaves once
// enabled, check the browser console for CSP violations and extend these lists.
const IONOS = "https://ionos.ai-voicereceptionist.com";
const csp = [
  "default-src 'self'",
  // Next.js inlines bootstrap scripts; nonces would force every page to render dynamically.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${IONOS}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""} ${IONOS} wss://ionos.ai-voicereceptionist.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
  `frame-src https://calendly.com https://*.calendly.com ${IONOS}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(https ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // No `preload`: getting off the preload list is slow, so that's a deliberate later decision.
  ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // E2E builds use their own output folder so they never disturb a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Diagram uploads (4 MB max) and JSON imports (2 MB) go through Server Actions, whose default limit is 1 MB.
    // Vercel caps function request bodies at 4.5 MB, so this can't usefully go higher.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
