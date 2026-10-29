import { getViewer, syncAttempt } from "@/lib/exam/service";
import { attemptErrorResponse, forbidden } from "@/lib/exam/http";
import { syncPayload } from "@/lib/exam/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIpKey, isSameOrigin } from "@/lib/security/request";

// Autosave for an attempt in progress. The server decides whether writes are
// still allowed (status and deadline), never the client.
export async function POST(request: Request, ctx: RouteContext<"/api/attempts/[id]/sync">) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await ctx.params;

  // Per attempt, so a class on one campus network can't throttle each other near a deadline;
  // a generous per-network ceiling still stops floods across made-up attempt ids.
  const ip = await clientIpKey();
  const [perAttempt, perNetwork] = await Promise.all([rateLimit(`sync:${id}:${ip}`, 1200, 600), rateLimit(`sync-net:${ip}`, 20_000, 600)]);
  const limit = !perAttempt.ok ? perAttempt : perNetwork;
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid", message: "Body must be JSON." }, { status: 400 });
  }
  const parsed = syncPayload.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid", message: "Malformed autosave payload." }, { status: 400 });

  try {
    return Response.json(await syncAttempt(id, await getViewer(), parsed.data));
  } catch (e) {
    return attemptErrorResponse(e);
  }
}
