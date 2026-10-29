// Server-authoritative timing. The deadline is fixed when a timed attempt starts;
// the client only displays it. A short grace absorbs network latency on the
// final autosave, never more.

export const WRITE_GRACE_MS = 5_000;

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

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
