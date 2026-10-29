import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { domainRedirect } from "@/lib/domains";

const SIGNED_IN_AREAS = ["/admin", "/dashboard"];

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const target = domainRedirect(host, request.nextUrl.pathname, request.nextUrl.search);
  if (target) return NextResponse.redirect(target, 308);

  // Optimistic check only: no cookie means certainly signed out, so send a real
  // 307 before any rendering. Whether a cookie is valid, and whether its user may
  // see the page, is decided by the data access layer (src/lib/auth/dal.ts).
  const { pathname } = request.nextUrl;
  if (SIGNED_IN_AREAS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !request.cookies.has(SESSION_COOKIE)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
