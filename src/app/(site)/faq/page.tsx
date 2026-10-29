import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { Container, PageIntro } from "@/components/site/section";
import { faqs } from "@/lib/faq";

export const metadata: Metadata = { title: "FAQ", description: "Answers about tutoring, practice sets, payment and accounts.", alternates: { canonical: "/faq" } };

export default function FaqPage() {
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
          <div className="divide-y border-y">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-navy">
                  {f.q}
                  <span aria-hidden className="text-xl text-muted-foreground transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand title="Still have a question?" />
    </>
  );
}
