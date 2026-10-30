import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, type CspEnv } from "@/lib/csp";

const base: CspEnv = { dev: false, https: true };
const directives = (env: CspEnv) => new Map(contentSecurityPolicy(env).split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)] as const));

describe("contentSecurityPolicy", () => {
  it("allows no third party but Calendly's frame when nothing optional is configured", () => {
    const csp = contentSecurityPolicy(base);
    expect(csp).not.toMatch(/ionos|sentry|supabase/);
    const d = directives(base);
    expect(d.get("frame-src")).toEqual(["https://calendly.com"]);
    expect(d.get("img-src")).toEqual(["'self'", "data:", "blob:"]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
    expect(d.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("blocks inline event-handler attributes and keeps the fixed protections", () => {
    const d = directives(base);
    expect(d.get("script-src-attr")).toEqual(["'none'"]);
    for (const [k, v] of [["frame-ancestors", "'none'"], ["object-src", "'none'"], ["base-uri", "'self'"], ["form-action", "'self'"], ["default-src", "'self'"]]) expect(d.get(k), k).toEqual([v]);
    expect(d.has("upgrade-insecure-requests")).toBe(true);
    expect(directives({ ...base, https: false }).has("upgrade-insecure-requests")).toBe(false);
  });

  it("adds the IONOS chat hosts only with an agent id", () => {
    const d = directives({ ...base, ionosAgentId: "agent-1" });
    expect(d.get("script-src")).toContain("https://ionos.ai-voicereceptionist.com");
    expect(d.get("connect-src")).toEqual(expect.arrayContaining(["https://ionos.ai-voicereceptionist.com", "wss://ionos.ai-voicereceptionist.com"]));
    expect(d.get("frame-src")).toEqual(["https://calendly.com", "https://ionos.ai-voicereceptionist.com"]);
    expect(contentSecurityPolicy({ ...base, ionosAgentId: "  " })).not.toContain("ionos");
  });

  it("adds only the DSN's Sentry host, and the ingest wildcards if the DSN can't be read", () => {
    expect(directives({ ...base, sentryDsn: "https://abc123@o4507.ingest.us.sentry.io/4508" }).get("connect-src")).toEqual(["'self'", "https://o4507.ingest.us.sentry.io"]);
    expect(directives({ ...base, sentryDsn: "not a url" }).get("connect-src")).toEqual(["'self'", "https://*.ingest.sentry.io", "https://*.ingest.us.sentry.io"]);
  });

  it("narrows Storage images to the Supabase project host", () => {
    expect(directives({ ...base, supabaseUrl: "https://abcdefgh.supabase.co/" }).get("img-src")).toEqual(["'self'", "data:", "blob:", "https://abcdefgh.supabase.co"]);
    expect(directives({ ...base, supabaseUrl: "garbage" }).get("img-src")).toContain("https://*.supabase.co");
  });

  it("adds eval and websockets for next dev only", () => {
    const d = directives({ ...base, dev: true });
    expect(d.get("script-src")).toContain("'unsafe-eval'");
    expect(d.get("connect-src")).toContain("ws:");
  });
});
