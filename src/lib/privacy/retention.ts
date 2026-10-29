import type { PrismaClient } from "@/generated/prisma/client";
import { GUEST_TTL_DAYS } from "@/lib/auth/cookies";

// Deletes data nobody can use any more. Kept free of "server-only" so it can be
// run from a script as well as the daily cron route.

const DAY = 86_400_000;

export type PurgeSummary = { sessions: number; resetTokens: number; rateLimitBuckets: number; guestAttempts: number; guestLessonAttempts: number };

export async function purgeExpired(db: PrismaClient, now = new Date()): Promise<PurgeSummary> {
  // A guest's history is reachable only through a guest cookie, which lasts GUEST_TTL_DAYS from when it was set.
  const guestCutoff = new Date(now.getTime() - GUEST_TTL_DAYS * DAY);
  const [sessions, resetTokens, rateLimitBuckets, guestAttempts, guestLessonAttempts] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date(now.getTime() - DAY) } }, { usedAt: { lt: new Date(now.getTime() - DAY) } }] } }),
    db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.attempt.deleteMany({ where: { userId: null, startedAt: { lt: guestCutoff } } }),
    db.lessonAttempt.deleteMany({ where: { userId: null, startedAt: { lt: guestCutoff } } }),
  ]);
  return {
    sessions: sessions.count,
    resetTokens: resetTokens.count,
    rateLimitBuckets: rateLimitBuckets.count,
    guestAttempts: guestAttempts.count,
    guestLessonAttempts: guestLessonAttempts.count,
  };
}
