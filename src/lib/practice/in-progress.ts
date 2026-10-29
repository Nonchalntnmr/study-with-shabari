import "server-only";
import { db } from "@/lib/db";
import { getViewer } from "@/lib/exam/service";

/** The viewer's unfinished attempts, newest first. Reads cookies: render inside Suspense. */
export async function getInProgressAttempts(examSlug?: string) {
  const v = await getViewer();
  if (!v.userId && !v.guestKeyHash) return [];
  return db.attempt.findMany({
    where: {
      status: "IN_PROGRESS",
      ...(examSlug ? { exam: { slug: examSlug } } : {}),
      ...(v.userId ? { userId: v.userId } : { userId: null, guestKeyHash: v.guestKeyHash }),
    },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: { id: true, mode: true, startedAt: true, deadlineAt: true, exam: { select: { title: true, slug: true } } },
  });
}
