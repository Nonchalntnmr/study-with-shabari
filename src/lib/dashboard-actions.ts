"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";

export async function toggleSavedResource(formData: FormData): Promise<void> {
  const user = await requireUser("/dashboard/saved");
  const parsed = z.object({ resourceId: z.string().min(1).max(64), save: z.enum(["1", "0"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { resourceId, save } = parsed.data;
  if (save === "1") {
    const exists = await db.resource.findFirst({ where: { id: resourceId, status: "PUBLISHED" }, select: { id: true } });
    if (exists) await db.savedResource.upsert({ where: { userId_resourceId: { userId: user.id, resourceId } }, create: { userId: user.id, resourceId }, update: {} });
  } else {
    await db.savedResource.deleteMany({ where: { userId: user.id, resourceId } });
  }
  revalidatePath("/dashboard/saved");
}
