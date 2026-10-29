import { db } from "@/lib/db";
import { purgeExpired } from "@/lib/privacy/retention";
import { safeEqual } from "@/lib/security/hash";

// Daily retention purge, called by Vercel Cron (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const summary = await purgeExpired(db);
  return Response.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store" } });
}
