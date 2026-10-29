import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { Container, PageIntro } from "@/components/site/section";
import { getPublishedTestimonials } from "@/lib/public-data";

export const metadata: Metadata = { title: "Testimonials", description: "What students say, shared with their permission.", alternates: { canonical: "/testimonials" } };

export default async function TestimonialsPage() {
  const testimonials = await getPublishedTestimonials();
  return (
    <>
      <PageIntro eyebrow="Testimonials" title="What students say." />
      <section className="py-16">
        <Container>
          {testimonials.length === 0 ? (
            <p className="max-w-xl text-lg text-muted-foreground">
              No testimonials yet. As students work with me, I’ll share what they say here, only with their written permission.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-2xl border bg-white p-7">
                  <blockquote className="text-lg leading-relaxed text-ink">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 text-sm">
                    <span className="font-semibold text-navy">{t.authorName}</span>
                    {t.authorDetail && <span className="text-muted-foreground"> · {t.authorDetail}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
