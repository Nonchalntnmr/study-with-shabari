// The Content-Security-Policy, built from the deployment's configuration so third parties are
// allowed only when the site actually embeds them. Pure so it can be unit tested; next.config.ts
// applies it to every response. next.config.ts is evaluated at build time, so changing one of
// these variables needs a redeploy (as NEXT_PUBLIC_* values already do).
//
// script-src keeps 'unsafe-inline': Next.js inlines its bootstrap and streaming scripts, and
// every route here is partially prerendered, so a per-request nonce can't reach the static
// shell's scripts. docs/SECURITY-AUDIT.md has the details.

export type CspEnv = {
  /** `next dev`: React needs eval for debugging and the dev server uses websockets. */
  dev: boolean;
  /** The site is served over https (NEXT_PUBLIC_SITE_URL), so mixed content can be upgraded. */
  https: boolean;
  /** NEXT_PUBLIC_IONOS_CHAT_AGENT_ID: the IONOS chat widget is embedded only when it's set. */
  ionosAgentId?: string;
  /** NEXT_PUBLIC_SENTRY_DSN: the browser SDK sends events to the DSN's host only when it's set. */
  sentryDsn?: string;
  /** SUPABASE_URL: uploaded diagrams are served from this project's Storage when it's set. */
  supabaseUrl?: string;
};

// The IONOS AI Frontdesk widget, as observed in Chromium and WebKit on 2026-10-30 (opening it and
// sending a message): its script from IONOS, then fetches to its chat provider for the widget's
// config and the conversation. No frames, websockets, images or fonts from elsewhere.
const IONOS = "https://ionos.ai-voicereceptionist.com";
const CHAT_PROVIDER = ["https://misc.aireceptionist.voiceable.tech", "https://engine.aireceptionist.voiceable.tech"];
// Calendly event and profile pages. src/lib/calendly.ts only ever embeds this origin; Calendly's
// own nested frames (payments, captcha) are governed by Calendly's CSP, not this one.
const CALENDLY = "https://calendly.com";
const SENTRY_FALLBACK = ["https://*.ingest.sentry.io", "https://*.ingest.us.sentry.io"];

function origin(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

/** The Sentry ingest origin for a DSN (https://<key>@<host>/<project>), or the ingest wildcards if it can't be read. */
function sentryHosts(dsn: string | undefined): string[] {
  if (!dsn?.trim()) return [];
  const o = origin(dsn);
  return o ? [o] : SENTRY_FALLBACK;
}

/** The Supabase project origin for Storage images, or the Supabase wildcard if SUPABASE_URL can't be read. */
function supabaseHosts(url: string | undefined): string[] {
  if (!url?.trim()) return [];
  const o = origin(url);
  return [o ?? "https://*.supabase.co"];
}

/**
 * `widget: false` is the policy for pages the chat widget never loads on (src/lib/widget-pages.ts):
 * no IONOS or chat-provider host at all, whatever the deployment's configuration.
 */
export function contentSecurityPolicy(env: CspEnv, { widget = true }: { widget?: boolean } = {}): string {
  const chat = widget && !!env.ionosAgentId?.trim();
  const ionos = chat ? [IONOS] : [];
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", "'unsafe-inline'", ...(env.dev ? ["'unsafe-eval'"] : []), ...ionos],
    // No inline event-handler attributes (onclick="..."): React and Next.js never emit them.
    ["script-src-attr", "'none'"],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:", ...supabaseHosts(env.supabaseUrl)],
    ["font-src", "'self'", "data:"],
    ["connect-src", "'self'", ...(env.dev ? ["ws:"] : []), ...(chat ? CHAT_PROVIDER : []), ...sentryHosts(env.sentryDsn)],
    ["frame-src", CALENDLY],
    ["frame-ancestors", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["object-src", "'none'"],
  ];
  if (env.https) directives.push(["upgrade-insecure-requests"]);
  return directives.map((d) => d.join(" ")).join("; ");
}
