import { describe, expect, it } from "vitest";
import { CUSTOM_HOST_PATTERN, CUSTOM_HOSTS, domainRedirect } from "@/lib/domains";
import nextConfig from "../../next.config";

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

describe("X-Robots-Tag on hosts other than the site's own domains", () => {
  // Next.js anchors `has`/`missing` values and matches them against the lowercased hostname, port removed.
  const custom = new RegExp(`^${CUSTOM_HOST_PATTERN}$`);

  it("covers the canonical apex and every redirecting host, and nothing else", () => {
    expect(CUSTOM_HOSTS).toEqual(expect.arrayContaining(["studywithshabari.com", "www.studywithshabari.com", "studywithshabari.org", "studywithshabari.info", "studywithshabari.store"]));
    expect(CUSTOM_HOSTS).toHaveLength(8);
    for (const host of CUSTOM_HOSTS) expect(custom.test(host), host).toBe(true);
    for (const host of ["study-with-shabari.vercel.app", "study-with-shabari-git-main-team.vercel.app", "localhost", "studywithshabari.com.evil.example", "xstudywithshabari.com", "studywithshabariXcom"]) {
      expect(custom.test(host), host).toBe(false);
    }
  });

  it("is sent with noindex wherever the host isn't one of them", async () => {
    const rules = await nextConfig.headers!();
    const rule = rules.find((r) => r.headers.some((h) => h.key === "X-Robots-Tag"));
    expect(rule).toMatchObject({ source: "/:path*", missing: [{ type: "host", value: CUSTOM_HOST_PATTERN }], headers: [{ key: "X-Robots-Tag", value: "noindex" }] });
    expect(rule!.has).toBeUndefined();
  });
});
