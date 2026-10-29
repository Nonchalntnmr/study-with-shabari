import { db } from "@/lib/db";
import { closeExpiredAttempts } from "@/lib/exam/service";
import { pinLegacyAttempts } from "@/lib/exam/versions";
import { inquiryPolicy, purgeExpired, purgeInquiries } from "@/lib/privacy/retention";
import { safeEqual } from "@/lib/security/hash";

// Daily retention job, called by Vercel Cron (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
// Setup and policy: docs/PRIVACY-REVIEW.md.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const legacyAttempts = await pinLegacyAttempts(db);
  const summary = await purgeExpired(db);
  const closedAttempts = await closeExpiredAttempts();
  const inquiries = await purgeInquiries(db, inquiryPolicy());
  return Response.json({ ok: true, ...summary, closedAttempts, inquiries, legacyAttempts }, { headers: { "Cache-Control": "no-store" } });
}
