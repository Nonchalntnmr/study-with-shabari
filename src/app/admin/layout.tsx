import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/lessons", label: "Lessons" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/topics", label: "Topics" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/quality", label: "Question quality" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
      <nav aria-label="Admin" className="md:w-48 md:shrink-0">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="block whitespace-nowrap rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 truncate px-2 text-xs text-muted-foreground" title={admin.email}>
          {admin.email}
        </p>
      </nav>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
