import { describe, expect, it } from "vitest";
import { isSignedInArea, normalizePathname } from "@/lib/auth/signed-in-areas";

describe("signed-in areas (proxy cookie check)", () => {
  it("matches the admin and dashboard areas", () => {
    for (const p of ["/admin", "/admin/", "/admin/users", "/dashboard", "/dashboard/account"]) expect(isSignedInArea(p), p).toBe(true);
  });

  it("leaves public paths alone, including look-alikes", () => {
    for (const p of ["/", "/login", "/lessons/dopamine", "/administrator", "/admins", "/dashboards", "/practice/admin", "/%2561", "/caf%C3%A9"]) {
      expect(isSignedInArea(p), p).toBe(false);
    }
  });

  it("matches encoded, mixed-case and doubled-slash spellings the router resolves to the same pages", () => {
    for (const p of ["/%61dmin", "/%61dmin/users", "/admin%2Fusers", "/admin%2fusers", "/%64ashboard", "/dashboard%2Faccount", "/%2561dmin", "/ADMIN", "/Dashboard/Account", "//admin", "/admin//users", "/%2Fadmin"]) {
      expect(isSignedInArea(p), p).toBe(true);
    }
  });

  it("treats a path that can't be decoded as signed-in-only", () => {
    expect(normalizePathname("/%E0%A4%A")).toBeNull();
    expect(isSignedInArea("/%E0%A4%A")).toBe(true);
    expect(isSignedInArea("/admin%")).toBe(true);
  });

  it("normalizes to the router's view of the path", () => {
    expect(normalizePathname("/%61dmin//Users")).toBe("/admin/users");
    expect(normalizePathname("/lessons/dopamine")).toBe("/lessons/dopamine");
  });
});
