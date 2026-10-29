import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security/hash";
import type { Role } from "@/generated/prisma/enums";
import { GUEST_COOKIE, GUEST_TTL_DAYS, SESSION_COOKIE, SESSION_TTL_DAYS, cookieOptions } from "./cookies";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

/**
 * The signed-in user for this request, or null. Deduplicated per request.
 * Reads cookies, so callers must sit behind a Suspense boundary (loading.tsx).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      expiresAt: true,
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.user;
});

/** Route handlers and server actions only: these may set cookies. */
export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      userAgent,
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_DAYS));
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Hash of this browser's guest key, or null if it has never practiced as a guest. */
export async function getGuestKeyHash(): Promise<string | null> {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  return token ? sha256(token) : null;
}

/** Route handlers and server actions only. Creates the guest cookie on first use. */
export async function ensureGuestKeyHash(): Promise<string> {
  const jar = await cookies();
  let token = jar.get(GUEST_COOKIE)?.value;
  if (!token) {
    token = randomToken();
    jar.set(GUEST_COOKIE, token, cookieOptions(GUEST_TTL_DAYS));
  }
  return sha256(token);
}

/** After sign-in, move this browser's guest attempts onto the account. */
export async function claimGuestAttempts(userId: string): Promise<number> {
  const guestKeyHash = await getGuestKeyHash();
  if (!guestKeyHash) return 0;
  const { count } = await db.attempt.updateMany({
    where: { guestKeyHash, userId: null },
    data: { userId, guestKeyHash: null },
  });
  return count;
}
