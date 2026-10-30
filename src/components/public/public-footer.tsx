import Link from "next/link";
import { availableLinks } from "@/lib/availability";
import { getAvailability } from "@/lib/public-data";
import { contactEmail, founder } from "@/lib/site";

// Spec section 17: name, email and links to every section.
const COLUMNS = [
  {
    title: "MCAT Prep",
    links: [
      { href: "/mcat", label: "MCAT tutoring" },
      { href: "/practice", label: "Free practice test" },
      { href: "/resources", label: "Free notes" },
      { href: "/dopamine", label: "Free dopamine lesson" },
    ],
  },
  {
    title: "College Admissions",
    links: [
      { href: "/admissions", label: "Admissions consulting" },
      { href: "/admissions#record", label: "My high school record" },
      { href: "/admissions#help", label: "What I help with" },
      { href: "/pricing#admissions", label: "Admissions pricing" },
    ],
  },
  {
    title: "Shabari",
    links: [
      { href: "/about", label: "About" },
      { href: "/research", label: "Research & Teaching" },
      { href: "/pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Contact",
    links: [
      { href: "/book", label: "Book a call" },
      { href: "/contact", label: "Send a message" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export async function PublicFooter() {
  const availability = await getAvailability();
  const columns = COLUMNS.map((c) => ({ ...c, links: availableLinks(c.links, availability) }));
  return (
    <footer className="border-t border-hairline bg-mist">
      <div className="mx-auto grid max-w-[1320px] gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_2.4fr]">
        <div>
          <p className="font-display text-[1.9rem] leading-tight text-hema">Study with Shabari</p>
          <p className="mt-3 max-w-xs text-quiet">MCAT prep and college admissions consulting with {founder.name}.</p>
          <a href={`mailto:${contactEmail}`} className="mt-5 inline-block font-medium text-eosin underline decoration-1 underline-offset-4">
            {contactEmail}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {columns.map((c) => (
            <nav key={c.title} aria-label={`Footer: ${c.title}`}>
              <p className="text-sm font-semibold text-hema">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[0.95rem] text-specimen/75 hover:text-eosin">
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
        <div className="mx-auto max-w-[1320px] space-y-2 px-5 py-7 text-sm text-quiet sm:px-8">
          <p>
            Study with Shabari is an independent tutoring and consulting service. It isn’t affiliated with or endorsed by MIT, any other
            university, or the AAMC. MCAT is a registered trademark of the Association of American Medical Colleges. Practice results are percent
            correct, not official scaled scores.
          </p>
          <p>© 2026 {founder.name}</p>
        </div>
      </div>
    </footer>
  );
}
