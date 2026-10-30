"use client";

import { useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { bookCta } from "@/lib/founder-facts";
import { PublicMenu } from "./public-menu";

/**
 * White bar with the spec's navigation. A hairline appears once the page scrolls.
 * `links` is the spec's nav minus anything not yet published (availableLinks).
 */
export function PublicNav({ links, account, className = "" }: { links: { href: string; label: string }[]; account: React.ReactNode; className?: string }) {
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));
  const current = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={`sticky top-0 z-50 bg-white/95 backdrop-blur transition-shadow duration-300 ${scrolled ? "shadow-[0_1px_0_0_#E2E8F0]" : ""} ${className}`}>
      <div className="mx-auto flex h-[4.25rem] max-w-[1320px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="shrink-0 font-display text-[1.35rem] leading-none tracking-[-0.01em] text-hema" aria-label="Study with Shabari, home">
          Study with Shabari
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 min-[1180px]:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current(l.href) ? "page" : undefined}
              className="text-[0.9rem] font-medium text-specimen/75 transition-colors hover:text-hema aria-[current=page]:text-hema"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="hidden text-[0.9rem] min-[1180px]:block">{account}</div>
          <Link
            href={bookCta.href}
            className="hidden h-10 items-center rounded-full px-5 text-[0.9rem] font-semibold text-hema ring-1 ring-inset ring-hema/25 transition-colors hover:ring-hema/60 sm:inline-flex"
          >
            {bookCta.label}
          </Link>
          <PublicMenu links={[...links, { ...bookCta }, { href: "/faq", label: "FAQ" }, { href: "/contact", label: "Contact" }, { href: "/dashboard", label: "Your dashboard" }]} />
        </div>
      </div>
    </header>
  );
}
