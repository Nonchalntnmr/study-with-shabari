import "server-only";
import { db } from "@/lib/db";
import { funnelDay, type FunnelEvent } from "./events";

/** Adds one to today's count. Never throws: a missed count must not break the page. */
export async function countEvent(event: FunnelEvent): Promise<void> {
  const day = funnelDay(new Date());
  try {
    await db.funnelDaily.upsert({ where: { day_event: { day, event } }, create: { day, event, count: 1 }, update: { count: { increment: 1 } } });
  } catch {
    // Counting is best-effort.
  }
}
