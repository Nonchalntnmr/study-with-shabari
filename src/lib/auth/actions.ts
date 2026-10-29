"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/security/audit";
import { hmac } from "@/lib/security/hash";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIpKey } from "@/lib/security/request";
import { GUEST_COOKIE, SESSION_COOKIE } from "./cookies";
import { requireUser } from "./dal";
import { safeNextPath } from "./next-path";
import { PASSWORD_MIN_LENGTH, getDummyHash, hashPassword, verifyPassword } from "./password";
import { consumeResetToken, createResetToken } from "./password-reset";
import { claimGuestAttempts, createSession, destroySession, getGuestKeyHash } from "./session";
import { mailConfigured, sendEmail } from "@/lib/email/transport";
import { passwordResetEmail } from "@/lib/email/templates";
import { contactEmail, siteUrl } from "@/lib/site";
import { sha256 } from "@/lib/security/hash";

export type AuthState = { error?: string; fields?: { email?: string; name?: string } } | null;

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));
const password = z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`).max(200);

const signUpSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email,
  password,
  next: z.string().optional(),
});

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  const fields = { email: String(formData.get("email") ?? ""), name: String(formData.get("name") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again.", fields };

  const limit = await rateLimit(`signup:${await clientIpKey()}`, 10, 3600);
  if (!limit.ok) return { error: "Too many sign-ups from this network. Try again later.", fields };

  const { name, next } = parsed.data;
  if (await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) {
    return { error: "An account with that email already exists. Try signing in.", fields };
  }
  const user = await db.user.create({
    data: { email: parsed.data.email, name: name || null, passwordHash: await hashPassword(parsed.data.password), lastLoginAt: new Date() },
  });
  await createSession(user.id);
  await claimGuestAttempts(user.id);
  redirect(safeNextPath(next));
}

const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(200), next: z.string().optional() });

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  const fields = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again.", fields };

  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login-ip:${await clientIpKey()}`, 30, 900),
    rateLimit(`login-email:${hmac(parsed.data.email)}`, 10, 900),
  ]);
  if (!byIp.ok || !byEmail.ok) return { error: "Too many attempts. Wait a few minutes and try again.", fields };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Same work whether or not the account exists, so timing doesn't reveal which emails are registered.
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return { error: "That email and password don’t match.", fields };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  await claimGuestAttempts(user.id);
  redirect(safeNextPath(parsed.data.next, user.role === "ADMIN" ? "/admin" : "/dashboard"));
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

// ------------------------------------------------------------------ account

export type AccountState = { ok?: string; error?: string } | null;

export async function updateProfile(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser("/dashboard/account");
  const parsed = z
    .object({
      name: z.string().trim().max(100),
      targetTestDate: z.union([z.literal(""), z.iso.date()]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the name and date and try again." };
  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name || null,
      targetTestDate: parsed.data.targetTestDate ? new Date(`${parsed.data.targetTestDate}T00:00:00Z`) : null,
    },
  });
  return { ok: "Saved." };
}

/** Permanently deletes the account and everything attached to it (sessions, attempts, answers). */
export async function deleteAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser("/dashboard/account");
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true, role: true } });
  if (!(await verifyPassword(String(formData.get("password") ?? ""), row.passwordHash))) {
    return { error: "That password isn’t right." };
  }
  if (row.role === "ADMIN" && (await db.user.count({ where: { role: "ADMIN" } })) <= 1) {
    return { error: "You’re the only admin. Make someone else an admin before deleting this account." };
  }
  await db.user.delete({ where: { id: user.id } });
  // The log keeps that a deletion happened, not the person's data.
  await audit(null, "user.self_delete", "User", user.id, { role: row.role });
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/?account=deleted");
}

/** Lets a guest wipe the practice history stored against this browser. */
export async function clearGuestHistory(): Promise<void> {
  const guestKeyHash = await getGuestKeyHash();
  if (guestKeyHash) await db.attempt.deleteMany({ where: { guestKeyHash, userId: null } });
  (await cookies()).delete(GUEST_COOKIE);
  redirect("/practice?cleared=1");
}

export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const user = await requireUser("/dashboard/account");
  const parsed = z.object({ current: z.string().max(200), next: password }).safeParse({ current: formData.get("current"), next: formData.get("next") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(parsed.data.current, row.passwordHash))) return { error: "Your current password isn’t right." };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  // Keep this browser signed in; sign out every other device.
  await db.session.deleteMany({ where: { userId: user.id, ...(token ? { NOT: { tokenHash: sha256(token) } } : {}) } });
  await audit({ id: user.id, email: user.email }, "user.password_change", "User", user.id);
  return { ok: "Password changed. Other devices were signed out." };
}

export type ResetState = { ok?: string; error?: string; unavailable?: boolean } | null;

/** Always answers the same way whether or not the account exists. */
export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  if (!mailConfigured()) {
    return { unavailable: true, error: `Password reset by email isn’t switched on yet. Email ${contactEmail} from the address on your account and Shabari will help.` };
  }
  const parsed = z.object({ email }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`reset-ip:${await clientIpKey()}`, 10, 3600),
    rateLimit(`reset-email:${hmac(parsed.data.email)}`, 3, 3600),
  ]);
  const done: ResetState = { ok: "If an account uses that email, a reset link is on its way. It works for one hour." };
  if (!byIp.ok || !byEmail.ok) return done;
  const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (user) {
    const token = await createResetToken(user.id);
    await sendEmail({ template: "password-reset", to: parsed.data.email, ...passwordResetEmail(`${siteUrl}/reset-password?token=${token}`) });
  }
  return done;
}

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = z.object({ token: z.string().min(20).max(200), next: password }).safeParse({ token: formData.get("token"), next: formData.get("next") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const userId = await consumeResetToken(parsed.data.token, parsed.data.next);
  if (!userId) return { error: "This reset link is invalid or has expired. Request a new one." };
  await audit(null, "user.password_reset", "User", userId);
  await createSession(userId);
  redirect("/dashboard");
}
