import Link from "next/link";
import { AAMC_DISCLAIMER, contactEmail, footerNav, founder, mainNav } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            MCAT tutoring, free notes and original practice from {founder.name}.
          </p>
          <a href={`mailto:${contactEmail}`} className="text-sm font-medium text-blue hover:underline">
            {contactEmail}
          </a>
        </div>
        <nav aria-label="Footer: services" className="text-sm">
          <p className="mb-3 font-medium text-navy">Study</p>
          <ul className="space-y-2">
            {mainNav.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-muted-foreground hover:text-navy">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Footer: more" className="text-sm">
          <p className="mb-3 font-medium text-navy">More</p>
          <ul className="space-y-2">
            {footerNav.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-muted-foreground hover:text-navy">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>{AAMC_DISCLAIMER}</p>
          <p>© 2026 {founder.name}</p>
        </div>
      </div>
    </footer>
  );
}
