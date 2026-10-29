import "server-only";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/security/hash";
import { hashPassword } from "./password";

const TTL_MS = 60 * 60 * 1000;

/** Single-use reset token. Only its hash is stored; earlier unused tokens are revoked. */
export async function createResetToken(userId: string): Promise<string> {
  const token = randomToken();
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    db.passwordResetToken.create({ data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL_MS) } }),
  ]);
  return token;
}

/**
 * Sets a new password if the token is valid, unused and unexpired, then signs the
 * account out everywhere. Returns the user id, or null for any invalid token.
 */
export async function consumeResetToken(token: string, newPassword: string): Promise<string | null> {
  // Check the token before the (deliberately expensive) password hash, so junk tokens cost nothing.
  const found = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, select: { usedAt: true, expiresAt: true } });
  if (!found || found.usedAt || found.expiresAt.getTime() <= Date.now()) return null;
  const passwordHash = await hashPassword(newPassword);
  return db.$transaction(async (tx) => {
    const row = await tx.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) return null;
    // Conditional update so two concurrent uses can't both succeed.
    const { count } = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (count !== 1) return null;
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: row.userId } });
    return row.userId;
  });
}
