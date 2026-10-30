import { describe, expect, it } from "vitest";
import { safeCalendlyUrl } from "@/lib/calendly";

describe("safeCalendlyUrl", () => {
  it("accepts https Calendly event links and hides the GDPR banner", () => {
    expect(safeCalendlyUrl("https://calendly.com/shabari/15min")).toBe("https://calendly.com/shabari/15min?hide_gdpr_banner=1");
  });
  it("embeds www links from calendly.com, the one origin the CSP frames", () => {
    expect(safeCalendlyUrl("https://www.calendly.com/shabarishankar")).toBe("https://calendly.com/shabarishankar?hide_gdpr_banner=1");
  });
  it("refuses anything that would frame another site", () => {
    for (const bad of ["", undefined, "http://calendly.com/x/15min", "https://calendly.com.evil.example/x", "https://evil.example/calendly.com", "https://calendly.com/", "javascript:alert(1)"]) {
      expect(safeCalendlyUrl(bad)).toBeNull();
    }
  });
});
