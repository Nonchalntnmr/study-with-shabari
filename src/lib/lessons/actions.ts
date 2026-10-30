"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { ensureGuestKeyHash, getCurrentUser } from "@/lib/auth/session";
import { getViewer } from "@/lib/exam/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIpKey } from "@/lib/security/request";
import { LessonError, answerLessonStep, startLessonAttempt, startPreviewAttempt } from "./service";

// The public lesson URLs never use the admin role: what they show is decided before the page
// streams, from cached data, so a draft there is a real 404. Admins preview drafts under
// /admin/lessons/[id]/preview, which these actions reach with scope "admin".

export type LessonFormState = { error?: string } | null;

const slug = z.string().regex(/^[a-z0-9-]{2,80}$/);

export async function startLesson(_prev: LessonFormState, formData: FormData): Promise<LessonFormState> {
  const parsed = slug.safeParse(formData.get("slug"));
  if (!parsed.success) return { error: "That lesson isn’t available." };

  const limit = await rateLimit(`lesson:${await clientIpKey()}`, 60, 3600);
  if (!limit.ok) return { error: "You’ve started a lot of lessons in the last hour. Try again shortly." };

  const user = await getCurrentUser();
  const owner = user ? { userId: user.id, guestKeyHash: null } : { userId: null, guestKeyHash: await ensureGuestKeyHash() };
  let attemptId: string;
  try {
    attemptId = (await startLessonAttempt(parsed.data, owner, false)).id;
  } catch (e) {
    if (e instanceof LessonError) return { error: "That lesson isn’t available." };
    throw e;
  }
  redirect(`/lessons/${parsed.data}/a/${attemptId}`);
}

/** An admin's run-through of the current draft, published or not. */
export async function startLessonPreview(_prev: LessonFormState, formData: FormData): Promise<LessonFormState> {
  const admin = await requireAdmin();
  const lessonId = z.string().min(1).max(64).safeParse(formData.get("id"));
  if (!lessonId.success) return { error: "That lesson isn’t available." };
  let attemptId: string;
  try {
    attemptId = (await startPreviewAttempt(lessonId.data, admin.id)).id;
  } catch (e) {
    if (e instanceof LessonError) return { error: "That lesson isn’t available." };
    throw e;
  }
  redirect(`/admin/lessons/${lessonId.data}/preview/a/${attemptId}`);
}

const answerInput = z.object({
  slug,
  attemptId: z.string().min(1).max(64),
  position: z.coerce.number().int().min(0).max(200),
  choice: z.enum(["A", "B", "C", "D"], { message: "Choose an answer first." }),
  confidence: z.enum(["SURE", "UNSURE", "GUESSING"], { message: "Rate how sure you are before you check." }),
  elapsedMs: z.coerce.number().int().min(0).optional(),
  scope: z.enum(["admin"]).optional(),
});

export async function answerStep(_prev: LessonFormState, formData: FormData): Promise<LessonFormState> {
  const parsed = answerInput.safeParse({
    slug: formData.get("slug"),
    attemptId: formData.get("attemptId"),
    position: formData.get("position"),
    choice: formData.get("choice") ?? undefined,
    confidence: formData.get("confidence") ?? undefined,
    elapsedMs: formData.get("elapsedMs") || undefined,
    scope: formData.get("scope") || undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.path[0] === "choice") ?? parsed.error.issues.find((i) => i.path[0] === "confidence");
    return { error: issue?.message ?? "Something went wrong. Reload the page and try again." };
  }
  const { attemptId, position, scope } = parsed.data;
  const viewer = await getViewer();
  if (scope === "admin" && !viewer.isAdmin) return { error: "This question can’t be answered right now. Reload the page to continue." };
  let answered: Awaited<ReturnType<typeof answerLessonStep>>;
  try {
    answered = await answerLessonStep(attemptId, scope === "admin" ? viewer : { ...viewer, isAdmin: false }, {
      position,
      choiceLabel: parsed.data.choice,
      confidence: parsed.data.confidence,
      elapsedMs: parsed.data.elapsedMs ?? 0,
    });
  } catch (e) {
    if (e instanceof LessonError) return { error: "This question can’t be answered right now. Reload the page to continue." };
    throw e;
  }
  // The form may already be on this URL, so refresh too: a redirect to the same URL alone can leave the page as it was.
  refresh();
  const base = scope === "admin" && answered.mode === "preview" ? `/admin/lessons/${answered.lessonId}/preview/a/${attemptId}` : `/lessons/${parsed.data.slug}/a/${attemptId}`;
  redirect(`${base}?step=${position}`);
}
