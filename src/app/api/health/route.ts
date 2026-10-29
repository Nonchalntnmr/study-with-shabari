import { connection } from "next/server";
import { db } from "@/lib/db";

// Liveness plus a real database round trip, for uptime checks after deploy.
export async function GET() {
  await connection();
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up", dbLatencyMs: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
