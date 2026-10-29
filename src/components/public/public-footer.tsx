import Link from "next/link";
import { contactEmail, founder } from "@/lib/site";

const COLUMNS = [
  {
    title: "Study",
    links: [
      { href: "/practice", label: "Practice sets" },
      { href: "/resources", label: "Free notes" },
      { href: "/mcat-tutoring", label: "MCAT tutoring" },
      { href: "/admissions", label: "Admissions" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About Shabari" },
      { href: "/pricing", label: "Pricing" },
      { href: "/testimonials", label: "Testimonials" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Contact",
    links: [
      { href: "/book", label: "Book a free call" },
      { href: "/contact", label: "Send a message" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-hairline bg-slide">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <p className="font-display text-4xl leading-tight text-hema">Study with Shabari</p>
          <p className="mt-4 max-w-sm text-quiet">MCAT tutoring, free notes and original practice from {founder.name}.</p>
          <a href={`mailto:${contactEmail}`} className="mt-6 inline-block text-fixative-ink underline decoration-1 underline-offset-4">
            {contactEmail}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={`Footer: ${c.title}`}>
              <p className="text-sm font-semibold text-hema">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[0.95rem] text-specimen/80 hover:text-hema">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto max-w-[1400px] space-y-2 px-5 py-7 text-sm text-quiet sm:px-8">
          <p>
            Study with Shabari is an independent tutoring service. It isn’t affiliated with or endorsed by MIT or the AAMC. MCAT is a registered
            trademark of the Association of American Medical Colleges. Practice results are percent correct, not official scaled scores.
          </p>
          <p>© 2026 {founder.name}</p>
        </div>
      </div>
    </footer>
  );
}
