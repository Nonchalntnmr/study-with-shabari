import { mcatPricing } from "./founder-facts";

// The MCAT pricing table's rows, built from the founder's packages (founder-facts.ts mcatPricing).
// prisma/seed.ts writes them to fresh databases and scripts/sync-mcat-pricing.ts to an existing one.

export type PlanRow = {
  slug: string;
  name: string;
  priceLabel: string;
  detail: string | null;
  features: string[];
  note: string | null;
  ctaLabel: string;
  ctaHref: string;
  featured: boolean;
  position: number;
};

// What the free call is for: the site's own description, not a claim about Shabari.
const CONSULT_FEATURES = ["Talk through your timeline, scores and weak spots", "Leave with a next step, whether or not we work together"];

export const mcatPlanRows: PlanRow[] = mcatPricing.map((p, position) => ({
  slug: p.slug,
  name: p.name,
  priceLabel: p.price,
  detail: null,
  features: p.slug === "consult" ? CONSULT_FEATURES : [...p.items],
  note: null,
  ctaLabel: p.slug === "consult" ? "Book a free call" : "Start with a free call",
  ctaHref: "/book?service=mcat",
  featured: p.slug === "full-mcat-package",
  position,
}));
