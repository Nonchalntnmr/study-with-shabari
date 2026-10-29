import type { Metadata } from "next";
import { DeleteAccountForm, ProfileForm } from "@/components/dashboard/account-forms";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";


// Signed-in content is read fresh per request, so this segment opts out of instant-navigation validation.
export const instant = false;
export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/dashboard/account");
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, targetTestDate: true, createdAt: true } });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">Account</h1>
        <p className="mt-1 text-muted-foreground">
          Signed in as {row.email} · member since {row.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </header>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        <ProfileForm name={row.name ?? ""} testDate={row.targetTestDate?.toISOString().slice(0, 10) ?? ""} />
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-muted-foreground">Download everything this site stores about you: your profile, attempts, answers and saved resources.</p>
        <Button asChild variant="outline" className="mt-4">
          <a href="/api/account/export" download>
            Download my data (JSON)
          </a>
        </Button>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Sign out</h2>
        <form action={signOut} className="mt-3">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </section>
      <section className="rounded-2xl border border-danger/30 bg-danger-soft/40 p-6">
        <h2 className="text-lg font-semibold text-danger">Delete account</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          This permanently deletes your account, practice history and saved resources. It can’t be undone.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
