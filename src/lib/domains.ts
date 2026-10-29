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
