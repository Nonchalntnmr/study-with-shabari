// Which request paths belong to the signed-in areas, for the proxy's optimistic cookie check.
// Pure so it can be unit tested; src/proxy.ts applies it.
//
// The proxy sees the raw, still-encoded pathname, but the router decodes it before matching
// a route, so "/%61dmin" and "/admin%2Fusers" render the admin pages. Match on the path the
// router will see: decoded (repeatedly, so a double encoding can't hide it either), lowercased,
// with repeated slashes collapsed. A path that can't be decoded is treated as signed-in-only.

export const SIGNED_IN_AREAS = ["/admin", "/dashboard"] as const;

/** The pathname as the router resolves it, or null when it isn't valid percent-encoding. */
export function normalizePathname(pathname: string): string | null {
  let path = pathname;
  for (let i = 0; i < 5; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return null;
    }
    if (decoded === path) break;
    path = decoded;
  }
  return path.toLowerCase().replace(/\/{2,}/g, "/");
}

/** True when the path needs a session: a signed-in area, or a path that can't be decoded safely. */
export function isSignedInArea(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === null) return true;
  return SIGNED_IN_AREAS.some((area) => path === area || path.startsWith(`${area}/`));
}
