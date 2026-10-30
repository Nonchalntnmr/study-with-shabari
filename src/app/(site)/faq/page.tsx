import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { Container, PageIntro } from "@/components/site/section";
import { faqForVisitors } from "@/lib/availability";
import { faqs as allFaqs } from "@/lib/faq";
import { getAvailability } from "@/lib/public-data";

export const metadata: Metadata = { title: "FAQ", description: "Answers about MCAT prep, college admissions, sessions, payment and the free practice platform.", alternates: { canonical: "/faq" } };

export default async function FaqPage() {
  const faqs = faqForVisitors(allFaqs, await getAvailability());
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageIntro eyebrow="FAQ" title="Questions" />
      <section className="py-16">
        <Container className="max-w-3xl">
          <div className="divide-y divide-hairline border-y border-hairline">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-hema">
                  {f.q}
                  <span aria-hidden className="text-xl text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[1.0625rem] text-specimen/85">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand title="Still have a question?" />
    </>
  );
}
