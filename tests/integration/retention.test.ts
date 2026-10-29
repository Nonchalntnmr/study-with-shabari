import { beforeEach, describe, expect, it } from "vitest";
import { purgeExpired } from "@/lib/privacy/retention";
import { db, resetData } from "../support/db";

const DAY = 86_400_000;

describe("retention purge", () => {
  beforeEach(resetData);

  it("deletes expired sessions, old reset tokens, expired rate-limit buckets and guest history older than the guest cookie", async () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const ago = (days: number) => new Date(now.getTime() - days * DAY);
    const user = await db.user.create({ data: { email: "s@test.local", passwordHash: "x" } });
    await db.session.createMany({
      data: [
        { tokenHash: "expired", userId: user.id, expiresAt: ago(1) },
        { tokenHash: "live", userId: user.id, expiresAt: new Date(now.getTime() + DAY) },
      ],
    });
    await db.passwordResetToken.createMany({
      data: [
        { tokenHash: "old", userId: user.id, expiresAt: ago(3) },
        { tokenHash: "fresh", userId: user.id, expiresAt: new Date(now.getTime() + 3600_000) },
      ],
    });
    await db.rateLimitBucket.createMany({
      data: [
        { key: "k", windowStart: ago(2), count: 1, expiresAt: ago(1) },
        { key: "k", windowStart: now, count: 1, expiresAt: new Date(now.getTime() + 60_000) },
      ],
    });
    await db.lessonAttempt.createMany({
      data: [
        { guestKeyHash: "g", startedAt: ago(181) },
        { guestKeyHash: "g", startedAt: ago(10) },
        { userId: user.id, startedAt: ago(400) },
      ],
    });

    expect(await purgeExpired(db, now)).toEqual({ sessions: 1, resetTokens: 1, rateLimitBuckets: 1, guestAttempts: 0, guestLessonAttempts: 1 });
    expect(await db.session.count()).toBe(1);
    // Account data stays until the student deletes the account.
    expect(await db.lessonAttempt.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.lessonAttempt.count({ where: { userId: null } })).toBe(1);
  });
});
