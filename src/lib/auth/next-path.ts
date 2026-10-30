const BASE = "http://next.invalid";

/**
 * Only allow same-site relative paths as post-login destinations. URL parsers
 * strip tabs and newlines and read backslashes as slashes, so "/\t/evil.example"
 * becomes "//evil.example" by the time a browser follows it: reject those
 * characters outright, then confirm the parsed URL stays on this site.
 */
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || next.length > 2000) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  try {
    const u = new URL(next, BASE);
    if (u.origin !== BASE) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
