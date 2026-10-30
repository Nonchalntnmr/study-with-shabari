"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The /experience frame: a sticky bar whose "Book a free consult call" is on screen at every
// scroll position, at every width. It sits at the top so the chat bubble (bottom right) can
// never cover it.

export const BOOK_LABEL = "Book a free consult call";

export function bookHref(pathname: string) {
  return pathname.startsWith("/experience/admissions") ? "/book?service=admissions" : "/book?service=mcat";
}

export function ExperienceHeader() {
  const pathname = usePathname();
  return (
    <header className="exp-header sticky top-0 z-50 border-b border-[color:var(--exp-rule)] bg-[color:var(--exp-bar)] backdrop-blur-md">
      <div className="mx-auto flex h-[var(--exp-header)] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Study with Shabari, home" className="font-display text-[1rem] leading-[1.05] text-hema min-[420px]:text-[1.2rem] sm:text-[1.3rem]">
            <span className="block min-[420px]:inline">Study with </span>
            <span className="block min-[420px]:inline">Shabari</span>
          </Link>
          <Link
            href="/experience"
            className="hidden rounded-full border border-[color:var(--exp-rule)] px-2.5 py-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-quiet hover:text-hema md:inline-block"
          >
            Prototype
          </Link>
        </div>
        <BookLink href={bookHref(pathname)} compact />
      </div>
    </header>
  );
}

export function BookLink({ href = "/book?service=mcat", compact = false, tone = "primary", className }: { href?: string; compact?: boolean; tone?: "primary" | "onDark"; className?: string }) {
  return (
    <Link
      href={href}
      data-book-cta
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-colors",
        compact ? "h-10 px-4 text-[0.875rem] sm:h-11 sm:px-5 sm:text-[0.95rem]" : "h-12 px-6 text-[1rem]",
        tone === "primary" ? "bg-eosin text-white hover:bg-eosin-ink" : "bg-white text-hema hover:bg-mist",
        className,
      )}
    >
      {BOOK_LABEL}
    </Link>
  );
}

export function SecondaryLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-12 items-center text-[1rem] font-semibold text-hema underline decoration-hema/30 decoration-2 underline-offset-[6px] transition-colors hover:decoration-eosin",
        className,
      )}
    >
      {children}
    </Link>
  );
}
