import { getViewer, submitAttempt } from "@/lib/exam/service";
import { attemptErrorResponse, forbidden } from "@/lib/exam/http";
import { isSameOrigin } from "@/lib/security/request";

export async function POST(request: Request, ctx: RouteContext<"/api/attempts/[id]/submit">) {
  if (!isSameOrigin(request)) return forbidden();
  const { id } = await ctx.params;
  try {
    const result = await submitAttempt(id, await getViewer());
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return attemptErrorResponse(e);
  }
}
