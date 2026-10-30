import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/next-path";
import { sniffImageType } from "@/lib/image-type";

describe("passwords", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batter", hash)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"));
  });
});

describe("safeNextPath", () => {
  it("allows same-site paths only", () => {
    expect(safeNextPath("/dashboard/history")).toBe("/dashboard/history");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath(undefined, "/admin")).toBe("/admin");
    expect(safeNextPath("/exam/abc?x=1#q3")).toBe("/exam/abc?x=1#q3");
  });

  it("rejects tricks that parse into another origin", () => {
    // Browsers strip TAB/CR/LF and read "\" as "/": each of these would land on //evil.example.
    const bad = [
      "/\t/evil.example/x", // TAB
      "/\r\n/evil.example", // CR LF
      "/\n/evil.example", // LF
      "/\\evil.example", // backslash
      "\\evil.example",
      "/\u0000/evil", // NUL
      "///evil.example", // protocol-relative
      "javascript:alert(1)",
    ];
    for (const b of bad) {
      expect(safeNextPath(b), JSON.stringify(b)).toBe("/dashboard");
    }
    // Percent-encoded characters stay inside the path and are harmless.
    expect(safeNextPath("/%2F%2Fevil.example")).toBe("/%2F%2Fevil.example");
  });
});

describe("sniffImageType", () => {
  it("identifies images by their bytes, not their names", () => {
    expect(sniffImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))?.type).toBe("image/png");
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.type).toBe("image/jpeg");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImageType(webp)?.type).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
  });
});
