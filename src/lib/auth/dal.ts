import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./session";

export { safeNextPath } from "./next-path";

// Data Access Layer: every protected page, action and route handler calls one of
// these, close to the data. The proxy never makes authorization decisions.

export async function requireUser(next = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Non-admins get a 404 so the admin area's existence isn't confirmed. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (user.role !== "ADMIN") notFound();
  return user;
}

/** For route handlers, which should answer with a status code instead of redirecting. */
export async function getAdminOrNull(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
}
