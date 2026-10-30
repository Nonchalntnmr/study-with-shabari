// Founder-provided facts, copied from the original landing page. Anything shown
// as a fact about Shabari must come from here so it can be reviewed in one place.

export const SITE_NAME = "Study with Shabari";
export const CANONICAL_HOST = "studywithshabari.com";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || `https://${CANONICAL_HOST}`
).replace(/\/$/, "");

// Keep the MIT address until hello@studywithshabari.com is a verified mailbox.
export const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "jshankar@mit.edu";

/**
 * Where sessions happen. Founder copy from the original site: the FAQ "Where do sessions happen?
 * On Zoom, so you can be anywhere.", the free call "15 minutes on Zoom", and the booking page
 * "You’ll get a confirmation email with a Zoom link."
 */
export const sessionPlatform = "Zoom";

/**
 * Where the free 15-minute call happens, as the booking pages promise it. Null while Calendly's
 * "initial consult" event has no location: checked 2026-10-30 in Calendly's own event data, so a
 * booking doesn't create a Zoom meeting yet. Set it to "Zoom" once that event has Zoom attached.
 */
export const consultPlatform: string | null = null;

export const founder = {
  name: "Shabari Shankar",
  shortName: "Shabari",
  school: "MIT",
  // Original page wording. Confirm with Shabari: it may be out of date by fall 2026.
  standing: "a senior at MIT",
  // As written in docs/FOUNDER-SPEC.md (MIT Class of 2027).
  majors: "Chemistry & Molecular Biology (Course 5-7) and Neuroscience (Course 9)",
  mcat: {
    taken: "January 2026",
    total: 522,
    // The original page lists only the three science sections she tutors.
    sections: { CP: 131, BB: 132, PS: 132 },
  },
  experience: [
    "Taught MIT intro chemistry recitations",
    "Wrote expert-level biology questions",
    "Research in genomics, immunology, and surgical AI",
    "First-author research publication",
  ],
} as const;

export const sectionNames = {
  CP: "Chemical and Physical Foundations",
  BB: "Biological and Biochemical Foundations",
  PS: "Psychological, Social, and Biological Foundations",
  CARS: "Critical Analysis and Reasoning Skills",
} as const;

export const sectionShort = {
  CP: "Chem/Phys",
  BB: "Bio/Biochem",
  PS: "Psych/Soc",
  CARS: "CARS",
} as const;

export type SectionCode = keyof typeof sectionNames;

export const mainNav = [
  { href: "/mcat", label: "MCAT Prep" },
  { href: "/admissions", label: "Admissions" },
  { href: "/practice", label: "Practice" },
  { href: "/resources", label: "Free notes" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export const footerNav = [
  { href: "/faq", label: "FAQ" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/contact", label: "Contact" },
  { href: "/book", label: "Book a call" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const AAMC_DISCLAIMER =
  "Study with Shabari is not affiliated with or endorsed by the AAMC. MCAT is a registered trademark of the Association of American Medical Colleges. Practice results here are percent correct, not official scaled scores.";
