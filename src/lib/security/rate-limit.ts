import "server-only";
import { db } from "@/lib/db";

export type RateLimitResult = { ok: boolean; count: number; retryAfterSec: number };

/**
 * Fixed-window counter in Postgres. Durable across serverless instances, so no
 * extra service (Redis/Upstash) is needed. `key` must already be non-identifying
 * (e.g. an HMAC of the client IP).
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const windowMs = windowSec * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "expiresAt")
    VALUES (${key}, ${windowStart}, 1, ${expiresAt})
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitBucket"."count" + 1
    RETURNING "count"`;

  // Opportunistic cleanup keeps the table small without a cron job.
  if (Math.random() < 0.02) {
    await db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
  }

  const count = Number(rows[0]?.count ?? 0);
  return {
    ok: count <= limit,
    count,
    retryAfterSec: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
  };
}
