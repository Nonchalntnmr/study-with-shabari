import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type Actor = { id: string; email: string } | null;

/** Record a sensitive admin or account action. Never put secrets in metadata. */
export async function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      metadata,
    },
  });
}
