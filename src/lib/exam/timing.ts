// Server-authoritative timing. The deadline is fixed when a timed attempt starts;
// the client only displays it. A short grace absorbs network latency on the
// final autosave, never more.

export const WRITE_GRACE_MS = 5_000;

/**
 * Answers made before the deadline but stuck offline can still be delivered for
 * this long after it. Only changes stamped before the deadline count, so no
 * answer can be made in extra time; the attempt is scored as of the deadline.
 */
export const LATE_DELIVERY_MS = 15 * 60_000;

export type TimedAttempt = {
  mode: "TIMED" | "UNTIMED";
  startedAt: Date;
  deadlineAt: Date | null;
};

export function computeDeadline(mode: "TIMED" | "UNTIMED", startedAt: Date, timeLimitSec: number): Date | null {
  return mode === "TIMED" ? new Date(startedAt.getTime() + timeLimitSec * 1000) : null;
}

/** Past the deadline: the attempt must be scored and closed. */
export function isExpired(attempt: TimedAttempt, now: number): boolean {
  return attempt.deadlineAt !== null && now > attempt.deadlineAt.getTime();
}

/** Writes are still accepted for WRITE_GRACE_MS after the deadline. */
export function acceptsWrites(attempt: TimedAttempt, now: number): boolean {
  return attempt.deadlineAt === null || now <= attempt.deadlineAt.getTime() + WRITE_GRACE_MS;
}

/** Past the deadline but still inside the late-delivery window. */
export function inLateDelivery(attempt: TimedAttempt, now: number): boolean {
  return attempt.deadlineAt !== null && now > attempt.deadlineAt.getTime() && now <= attempt.deadlineAt.getTime() + LATE_DELIVERY_MS;
}

export function remainingMs(attempt: TimedAttempt, now: number): number | null {
  return attempt.deadlineAt === null ? null : Math.max(0, attempt.deadlineAt.getTime() - now);
}

/**
 * Client-reported time on a question is cumulative. It can only grow, and can
 * never exceed the time the attempt has actually been open.
 */
export function clampTimeSpent(reported: number, previous: number, startedAt: Date, now: number): number {
  const elapsed = Math.max(0, now - startedAt.getTime());
  const value = Math.min(Math.max(0, Math.floor(reported)), elapsed);
  return Math.max(previous, value);
}

/**
 * When a change happened, for newest-wins ordering. The browser reports its
 * estimate on the server's clock; it can't predate the attempt or postdate its
 * arrival, so a wrong device clock can't make a change outrank later ones.
 * Older clients send nothing: the arrival time stands in.
 */
export function resolveChangedAt(reported: number | undefined, startedAt: number, now: number): number {
  if (reported === undefined || !Number.isFinite(reported)) return now;
  return Math.min(Math.max(Math.floor(reported), startedAt), now);
}

/**
 * Remaining time from a monotonic anchor: the server's clock at the last sync
 * plus time measured by performance.now() since then. A change to the device
 * clock (manual, NTP, sleep) can't move it; only a fresh server time can.
 */
export function remainingFromAnchor(deadlineAt: number, anchor: { serverNow: number; perfAt: number }, perfNow: number): number {
  return deadlineAt - (anchor.serverNow + (perfNow - anchor.perfAt));
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
