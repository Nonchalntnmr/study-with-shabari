import { beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/auth/password";
import { consumeResetToken, createResetToken } from "@/lib/auth/password-reset";
import { db, resetData } from "../support/db";

async function user() {
  const u = await db.user.create({ data: { email: `r${Date.now()}@example.com`, passwordHash: "x" } });
  await db.session.create({ data: { userId: u.id, tokenHash: `s-${u.id}`, expiresAt: new Date(Date.now() + 1e6) } });
  return u;
}

describe("password reset tokens", () => {
  beforeEach(resetData);

  it("sets the password once, stores only a hash, and signs out every session", async () => {
    const u = await user();
    const token = await createResetToken(u.id);
    const stored = await db.passwordResetToken.findFirstOrThrow({ where: { userId: u.id } });
    expect(stored.tokenHash).not.toBe(token);

    expect(await consumeResetToken(token, "brand-new-password")).toBe(u.id);
    const after = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await verifyPassword("brand-new-password", after.passwordHash)).toBe(true);
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);

    expect(await consumeResetToken(token, "another-password-1")).toBeNull();
  });

  it("rejects expired, unknown and superseded tokens", async () => {
    const u = await user();
    const first = await createResetToken(u.id);
    const second = await createResetToken(u.id);
    expect(await consumeResetToken(first, "brand-new-password")).toBeNull();

    await db.passwordResetToken.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await consumeResetToken(second, "brand-new-password")).toBeNull();
    expect(await consumeResetToken("not-a-real-token-at-all-xxxx", "brand-new-password")).toBeNull();
  });

  it("only one of two concurrent uses succeeds", async () => {
    const u = await user();
    const token = await createResetToken(u.id);
    const results = await Promise.all([consumeResetToken(token, "password-one-11"), consumeResetToken(token, "password-two-22")]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
