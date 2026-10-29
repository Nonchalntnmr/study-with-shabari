import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/security/rate-limit";
import { resetData } from "../support/db";

describe("rateLimit", () => {
  beforeEach(resetData);

  it("allows up to the limit within a window, then blocks", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("login:test", 3, 600));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[3].count).toBe(4);
    expect(results[3].retryAfterSec).toBeGreaterThan(0);
  });

  it("keeps keys independent and counts concurrent hits exactly", async () => {
    const hits = await Promise.all(Array.from({ length: 10 }, () => rateLimit("contact:a", 100, 600)));
    expect(hits.map((h) => h.count).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect((await rateLimit("contact:b", 1, 600)).ok).toBe(true);
  });
});
