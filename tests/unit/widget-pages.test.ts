import { describe, expect, it } from "vitest";
import { WIDGET_HIDDEN_PREFIXES, WIDGET_HIDDEN_SOURCES, widgetHidden } from "@/lib/widget-pages";

describe("pages without the chat widget", () => {
  it("hides it on the exam, lessons in progress, admin, account and auth pages", () => {
    for (const p of ["/exam/abc", "/admin", "/admin/lessons/1", "/dashboard", "/dashboard/account", "/login", "/signup", "/reset-password", "/forgot-password", "/lessons/dopamine/a/123", "/lessons/dopamine/a/123/result"]) {
      expect(widgetHidden(p), p).toBe(true);
    }
  });

  it("shows it on the public pages", () => {
    for (const p of ["/", "/mcat", "/admissions", "/practice", "/practice/cp-sample-set-1", "/resources", "/pricing", "/book", "/faq", "/contact", "/privacy", "/lessons/dopamine"]) {
      expect(widgetHidden(p), p).toBe(false);
    }
  });

  it("gives every hidden prefix a header source, so its CSP drops the widget hosts too", () => {
    for (const p of WIDGET_HIDDEN_PREFIXES) expect(WIDGET_HIDDEN_SOURCES).toContain(`${p}/:path*`);
    expect(WIDGET_HIDDEN_SOURCES).toContain("/lessons/:slug/a/:path*");
  });
});
