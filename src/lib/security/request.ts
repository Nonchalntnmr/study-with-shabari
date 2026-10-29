import "server-only";
import { headers } from "next/headers";
import { hmac } from "./hash";

/** Vercel overwrites x-forwarded-for with the real client address. */
export async function clientIpKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return hmac(`ip:${ip}`);
}

/**
 * CSRF defense for state-changing route handlers. Server Actions get the same
 * check from Next.js; route handlers have to do it themselves. Browsers always
 * send Origin on cross-origin and non-GET same-origin fetches.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
