// Pages where the IONOS chat widget never loads: the exam and lessons in progress (it could distract
// or help mid-test), admin and account pages, and the auth pages (a reset token sits in the URL
// fragment there). The widget (src/components/site/chat-widget.tsx) skips these pages, and
// next.config.ts gives them a CSP without the widget's hosts, so both read this one list.

export const WIDGET_HIDDEN_PREFIXES = ["/exam", "/admin", "/dashboard", "/login", "/signup", "/account", "/reset-password", "/forgot-password"];

const LESSON_ATTEMPT = /^\/lessons\/[^/]+\/a\//;

export function widgetHidden(pathname: string): boolean {
  return WIDGET_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p)) || LESSON_ATTEMPT.test(pathname);
}

/** The same pages as next.config.ts header sources (`/x/:path*` also matches `/x`). */
export const WIDGET_HIDDEN_SOURCES = [...WIDGET_HIDDEN_PREFIXES.map((p) => `${p}/:path*`), "/lessons/:slug/a/:path*"];
