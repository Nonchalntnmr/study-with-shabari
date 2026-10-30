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

// ------------------------------------------------------------------ contact messages

/** Provisional policy pending the owner's approval: 90 days after a message is closed. */
export const DEFAULT_INQUIRY_RETENTION_DAYS = 90;

export type InquiryPolicy = { days: number; enabled: boolean };

/**
 * Reads the policy from the environment. Deleting is off unless INQUIRY_PURGE=on,
 * so existing messages are never removed silently: until the owner approves, the
 * daily job only reports how many messages the policy would remove.
 */
export function inquiryPolicy(env: Record<string, string | undefined> = process.env): InquiryPolicy {
  const days = Number.parseInt(env.INQUIRY_RETENTION_DAYS ?? "", 10);
  return { days: Number.isFinite(days) && days >= 7 ? days : DEFAULT_INQUIRY_RETENTION_DAYS, enabled: env.INQUIRY_PURGE === "on" };
}

export type InquirySummary = { retentionDays: number; enabled: boolean; eligible: number; deleted: number; openPastRetention: number };

/**
 * Resolved and spam messages untouched for the retention period, with the
 * automatic-email records that hold the sender's address. Open messages (new or
 * in progress) are never deleted; they're counted so an admin can close them.
 */
export async function purgeInquiries(db: PrismaClient, policy: InquiryPolicy, now = new Date()): Promise<InquirySummary> {
  const cutoff = new Date(now.getTime() - policy.days * DAY);
  const where = { status: { in: ["RESOLVED" as const, "SPAM" as const] }, updatedAt: { lt: cutoff } };
  const [eligible, openPastRetention] = await Promise.all([
    db.inquiry.count({ where }),
    db.inquiry.count({ where: { status: { in: ["NEW", "IN_PROGRESS"] }, updatedAt: { lt: cutoff } } }),
  ]);
  let deleted = 0;
  if (policy.enabled && eligible > 0) {
    const ids = (await db.inquiry.findMany({ where, select: { id: true } })).map((i) => i.id);
    const [, gone] = await db.$transaction([db.emailMessage.deleteMany({ where: { inquiryId: { in: ids } } }), db.inquiry.deleteMany({ where: { id: { in: ids } } })]);
    deleted = gone.count;
  }
  return { retentionDays: policy.days, enabled: policy.enabled, eligible, deleted, openPastRetention };
}
