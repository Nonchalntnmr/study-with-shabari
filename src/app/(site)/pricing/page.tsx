import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { PlanCards } from "@/components/site/plan-cards";
import { Container, PageIntro } from "@/components/site/section";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free 15-minute consultation, a $2,000 full MCAT package, or a custom plan priced after we talk.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <PageIntro eyebrow="Pricing" title="Simple pricing. Every option starts free.">
        Start with a 15-minute call. If we work together, we’ll agree on the plan before you pay anything.
      </PageIntro>
      <section className="py-20">
        <Container>
          <PlanCards />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-7">
              <h2 className="text-lg font-semibold">How payment works</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                After your consultation, if we decide to work together, you pay by Zelle. Payment details are shared directly. This site
                has no card checkout and never asks for or stores bank information.
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-7">
              <h2 className="text-lg font-semibold">Free, for everyone</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                The study notes and practice sets on this site are free, with or without an account, and they stay that way.
              </p>
            </div>
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
