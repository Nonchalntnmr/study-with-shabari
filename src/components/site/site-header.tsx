import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { mainNav } from "@/lib/site";
import { AccountLink } from "./account-link";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-ink/75 transition-colors hover:text-navy">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <Suspense fallback={<span className="inline-block w-14" />}>
              <AccountLink />
            </Suspense>
          </div>
          <Button asChild size="lg" className="hidden h-9 px-4 sm:inline-flex">
            <Link href="/book">Book a free call</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
