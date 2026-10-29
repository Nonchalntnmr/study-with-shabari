import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Everything we hold about the signed-in student, as a download.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const data = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      email: true,
      name: true,
      role: true,
      targetTestDate: true,
      createdAt: true,
      lastLoginAt: true,
      savedResources: { select: { createdAt: true, resource: { select: { title: true } } } },
      attempts: {
        select: {
          id: true,
          mode: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          correctCount: true,
          totalCount: true,
          exam: { select: { title: true } },
          responses: { select: { questionId: true, selectedChoiceId: true, flagged: true, timeSpentMs: true, isCorrect: true } },
        },
      },
    },
  });
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="study-with-shabari-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
