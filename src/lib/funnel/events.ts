// First-party funnel: aggregate daily counts only. No user ids, IPs, cookies or
// per-visitor timelines are recorded, so there's nothing to link back to a person.

export const FUNNEL_EVENTS = ["lesson_started", "lesson_answered", "lesson_completed", "practice_started", "practice_completed", "booking_scheduled"] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

/** Daily counts below this are hidden in any view that could be shared, so a single visitor can't be picked out. */
export const SUPPRESS_BELOW = 5;

export type FunnelRow = { day: Date; event: string; count: number };
export type ShownCount = { day: Date; event: string; count: number | null };

/** Replaces small counts with null ("fewer than 5"). */
export function suppressSmall(rows: FunnelRow[], threshold = SUPPRESS_BELOW): ShownCount[] {
  return rows.map((r) => ({ ...r, count: r.count < threshold ? null : r.count }));
}

/** The UTC calendar day a count belongs to. */
export function funnelDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
