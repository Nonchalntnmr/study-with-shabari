import "server-only";
import { AttemptError } from "./service";

export function attemptErrorResponse(e: unknown): Response {
  if (e instanceof AttemptError) {
    const status = e.code === "not_found" ? 404 : e.code === "invalid" ? 400 : 409;
    return Response.json({ error: e.code, message: e.message }, { status });
  }
  throw e;
}

export const forbidden = () => Response.json({ error: "forbidden" }, { status: 403 });
