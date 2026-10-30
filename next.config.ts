import path from "node:path";
import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/csp";
import { CUSTOM_HOST_PATTERN } from "./src/lib/domains";
import { WIDGET_HIDDEN_SOURCES } from "./src/lib/widget-pages";

const isDev = process.env.NODE_ENV !== "production";
const https = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

// Third parties are allowed only when configured: the IONOS AI Chat widget, Sentry, Supabase
// Storage images, plus Calendly's booking iframe. See src/lib/csp.ts.
const cspEnv = {
  dev: isDev,
  https,
  ionosAgentId: process.env.NEXT_PUBLIC_IONOS_CHAT_AGENT_ID,
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  supabaseUrl: process.env.SUPABASE_URL,
};
const csp = contentSecurityPolicy(cspEnv);
// Exam, admin, dashboard, auth and lesson-attempt pages never load the chat widget, so their policy
// doesn't allow its hosts either (src/lib/widget-pages.ts).

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
  // Concept B: the MCAT half lives at /mcat.
  async redirects() {
    return [{ source: "/mcat-tutoring", destination: "/mcat", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Later rules win for the same header, so these replace the CSP on the widget-free pages.
      ...WIDGET_HIDDEN_SOURCES.map((source) => ({ source, headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy(cspEnv, { widget: false }) }] })),
      // Only the site's own domains may be indexed. The *.vercel.app URLs serve the same production
      // build (and its robots.txt), so they tell crawlers not to index anything. Not a redirect:
      // until DNS is cut over, the vercel.app URL is how the site is reached.
      { source: "/:path*", missing: [{ type: "host", value: CUSTOM_HOST_PATTERN }], headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
