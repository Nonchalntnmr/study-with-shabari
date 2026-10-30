// Host-based redirects for the secondary domains. Pure so it can be unit tested;
// src/proxy.ts applies it. Vercel itself upgrades http → https for every domain.

export const CANONICAL_ORIGIN = "https://studywithshabari.com";

type Rule = { keepPath: boolean; path?: string };

const RULES: Record<string, Rule> = {
  "www.studywithshabari.com": { keepPath: true },
  "studywithshabari.org": { keepPath: true },
  "www.studywithshabari.org": { keepPath: true },
  "studywithshabari.info": { keepPath: false, path: "/resources" },
  "www.studywithshabari.info": { keepPath: false, path: "/resources" },
  "studywithshabari.store": { keepPath: false, path: "/pricing" },
  "www.studywithshabari.store": { keepPath: false, path: "/pricing" },
};

/** Returns the absolute URL to redirect to, or null to serve the request. */
export function domainRedirect(host: string | null, pathname: string, search: string): string | null {
  if (!host) return null;
  const rule = RULES[host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "")];
  if (!rule) return null;
  return rule.keepPath ? `${CANONICAL_ORIGIN}${pathname}${search}` : `${CANONICAL_ORIGIN}${rule.path}`;
}

export const REDIRECT_HOSTS = Object.keys(RULES);

/** The site's own domains: the canonical apex and every host that redirects to it. */
export const CUSTOM_HOSTS = [new URL(CANONICAL_ORIGIN).host, ...REDIRECT_HOSTS];

/**
 * A regex source matching exactly the custom hosts, for next.config.ts `headers()` (`missing` host
 * conditions are anchored and matched against the hostname without its port). Any other host, such
 * as the *.vercel.app deployment URLs, gets `X-Robots-Tag: noindex`.
 */
export const CUSTOM_HOST_PATTERN = `(?:${CUSTOM_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|")})`;
