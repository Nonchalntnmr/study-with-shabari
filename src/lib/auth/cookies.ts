import { siteUrl } from "@/lib/site";

// __Host- cookies require HTTPS; local http runs (dev, E2E) use plain names.
const secure = siteUrl.startsWith("https://");

export const SESSION_COOKIE = secure ? "__Host-sws_session" : "sws_session";
export const GUEST_COOKIE = secure ? "__Host-sws_guest" : "sws_guest";

export const SESSION_TTL_DAYS = 30;
export const GUEST_TTL_DAYS = 180;

export function cookieOptions(maxAgeDays: number) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeDays * 24 * 60 * 60,
  };
}
