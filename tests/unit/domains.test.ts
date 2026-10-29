import { describe, expect, it } from "vitest";
import { domainRedirect } from "@/lib/domains";

describe("domainRedirect", () => {
  it("serves the canonical apex without redirecting", () => {
    expect(domainRedirect("studywithshabari.com", "/pricing", "")).toBeNull();
    expect(domainRedirect("localhost:3000", "/", "")).toBeNull();
    expect(domainRedirect(null, "/", "")).toBeNull();
  });

  it("sends www to the apex and keeps path and query", () => {
    expect(domainRedirect("www.studywithshabari.com", "/practice", "?s=CP")).toBe("https://studywithshabari.com/practice?s=CP");
  });

  it("sends .org to the same path on .com", () => {
    expect(domainRedirect("studywithshabari.org", "/", "")).toBe("https://studywithshabari.com/");
    expect(domainRedirect("www.studywithshabari.org", "/about", "")).toBe("https://studywithshabari.com/about");
  });

  it("sends every .info path to /resources and every .store path to /pricing", () => {
    expect(domainRedirect("studywithshabari.info", "/", "")).toBe("https://studywithshabari.com/resources");
    expect(domainRedirect("studywithshabari.info", "/anything", "?x=1")).toBe("https://studywithshabari.com/resources");
    expect(domainRedirect("www.studywithshabari.store", "/", "")).toBe("https://studywithshabari.com/pricing");
  });

  it("is case-insensitive and ignores ports and a trailing dot", () => {
    expect(domainRedirect("StudyWithShabari.ORG:443", "/", "")).toBe("https://studywithshabari.com/");
    expect(domainRedirect("studywithshabari.store.", "/", "")).toBe("https://studywithshabari.com/pricing");
  });

  it("never redirects to a host other than the canonical one", () => {
    for (const host of ["www.studywithshabari.com", "studywithshabari.org", "studywithshabari.info", "studywithshabari.store"]) {
      const target = domainRedirect(host, "//evil.example/x", "");
      expect(new URL(target!).host).toBe("studywithshabari.com");
    }
  });
});
