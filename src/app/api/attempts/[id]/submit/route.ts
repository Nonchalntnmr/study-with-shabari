import { getViewer, submitAttempt } from "@/lib/exam/service";
import { attemptErrorResponse, forbidden } from "@/lib/exam/http";
import { submitInput } from "@/lib/exam/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIpKey, isSameOrigin } from "@/lib/security/request";

// Submit with the browser's last unsaved changes. The server decides whether a
// timeout submit is due (its deadline, not the device clock).
export async function POST(request: Request, ctx: RouteContext<"/api/attempts/[id]/submit">) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await ctx.params;

  const limit = await rateLimit(`submit:${await clientIpKey()}`, 120, 600);
  if (!limit.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });

  // An empty body is a plain manual submit (older clients).
  const text = await request.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      return Response.json({ error: "invalid", message: "Body must be JSON." }, { status: 400 });
    }
  }
  const parsed = submitInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid", message: "Malformed submit payload." }, { status: 400 });

  try {
    const result = await submitAttempt(id, await getViewer(), parsed.data);
    return Response.json({ ok: result.status === "submitted", ...result });
  } catch (e) {
    return attemptErrorResponse(e);
  }
}
