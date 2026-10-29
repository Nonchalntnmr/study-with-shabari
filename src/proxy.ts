import { NextResponse, type NextRequest } from "next/server";
import { domainRedirect } from "@/lib/domains";

// Only domain routing lives here. Authorization is checked in the data access
// layer (src/lib/auth/dal.ts), next to the data.
export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const target = domainRedirect(host, request.nextUrl.pathname, request.nextUrl.search);
  if (target) return NextResponse.redirect(target, 308);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
