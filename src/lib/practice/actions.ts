"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, ensureGuestKeyHash } from "@/lib/auth/session";
import { AttemptError, getViewer, startAttempt, startRetest } from "@/lib/exam/service";
import { startInput } from "@/lib/exam/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIpKey } from "@/lib/security/request";

export type StartState = { error?: string } | null;

export async function startPractice(_prev: StartState, formData: FormData): Promise<StartState> {
  const parsed = startInput.safeParse({ examSlug: formData.get("examSlug"), mode: formData.get("mode") });
  if (!parsed.success) return { error: "Choose timed or untimed, then start." };

  const limit = await rateLimit(`start:${await clientIpKey()}`, 60, 3600);
  if (!limit.ok) return { error: "You’ve started a lot of sets in the last hour. Try again shortly." };

  const user = await getCurrentUser();
  const owner = user ? { userId: user.id, guestKeyHash: null } : { userId: null, guestKeyHash: await ensureGuestKeyHash() };
  let attemptId: string;
  try {
    attemptId = (await startAttempt(parsed.data, owner, user?.role === "ADMIN")).id;
  } catch (e) {
    if (e instanceof AttemptError) return { error: e.code === "not_found" ? "That practice set isn’t available." : e.message };
    throw e;
  }
  redirect(`/exam/${attemptId}`);
}

/** "Retest the ones you missed": an untimed attempt of the missed questions, linked to the original. */
export async function retestMissed(_prev: StartState, formData: FormData): Promise<StartState> {
  const attemptId = formData.get("attemptId");
  if (typeof attemptId !== "string" || attemptId.length > 64) return { error: "That practice set isn’t available." };
  const limit = await rateLimit(`start:${await clientIpKey()}`, 60, 3600);
  if (!limit.ok) return { error: "You’ve started a lot of sets in the last hour. Try again shortly." };
  let id: string;
  try {
    id = (await startRetest(attemptId, await getViewer())).id;
  } catch (e) {
    if (e instanceof AttemptError) return { error: e.code === "not_found" ? "That practice set isn’t available." : e.message };
    throw e;
  }
  redirect(`/exam/${id}`);
}
