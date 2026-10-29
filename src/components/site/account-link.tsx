import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

/** Reads the session, so it always renders inside a Suspense boundary. */
export async function AccountLink() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="text-sm font-medium text-ink/80 hover:text-navy">
        Sign in
      </Link>
    );
  }
  return (
    <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="text-sm font-medium text-ink/80 hover:text-navy">
      {user.role === "ADMIN" ? "Admin" : "Dashboard"}
    </Link>
  );
}
