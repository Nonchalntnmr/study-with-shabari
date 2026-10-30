import { faq as founderFaq } from "./founder-facts";

// The founder spec's seven answers first (docs/FOUNDER-SPEC.md), then answers that
// describe how this site's practice platform actually works.
export const faqs = [
  ...founderFaq,
  {
    q: "Do I need an account to practice?",
    a: "No. You can take any practice set as a guest, and your progress is saved in this browser. Create a free account if you want your history and analytics on any device.",
  },
  {
    q: "Is my practice score an MCAT score?",
    a: "No. Practice results are shown as percent correct. The questions are original, not AAMC questions, so there’s no honest way to convert them to an official scaled score, and the site doesn’t try.",
  },
  {
    q: "Is this affiliated with the AAMC?",
    a: "No. Study with Shabari is independent and not affiliated with or endorsed by the AAMC.",
  },
];
