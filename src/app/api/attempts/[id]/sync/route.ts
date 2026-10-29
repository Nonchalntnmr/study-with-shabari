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

  const limit = await rateLimit(`sync:${await clientIpKey()}`, 1200, 600);
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
