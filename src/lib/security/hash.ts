import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** URL-safe random token, 32 bytes of entropy by default. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return secret;
}

/** Keyed hash for identifiers we must not store raw (IP addresses). */
export function hmac(value: string): string {
  return createHmac("sha256", authSecret()).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
