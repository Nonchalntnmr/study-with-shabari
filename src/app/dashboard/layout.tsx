import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/analytics", label: "Progress" },
  { href: "/dashboard/plan", label: "Study plan" },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/saved", label: "Saved" },
  { href: "/dashboard/account", label: "Account" },
];

// No session read here: each page authorizes itself (layouts don't re-run on client navigation).
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <SiteHeader />
      <div className="border-b bg-white">
        <nav aria-label="Dashboard" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground hover:border-navy/30 hover:text-navy">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
