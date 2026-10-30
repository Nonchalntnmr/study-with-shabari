import type { Metadata } from "next";
import { Band, ButtonLink, Card, H2, Kicker, PaymentNote, Wrap } from "@/components/b/primitives";
import { PlanCards } from "@/components/site/plan-cards";
import { admissionsPricing } from "@/lib/founder-facts";

export const metadata: Metadata = {
  title: "Pricing",
  description: "MCAT: a free 15-minute consult, the $2,000 Full MCAT Package, or a custom plan. College admissions: a free consult, then packages priced on the call.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <section aria-labelledby="pricing-h" className="border-b border-hairline bg-mist pb-14 pt-10 sm:pb-16 sm:pt-16">
        <Wrap>
          <Kicker>Pricing</Kicker>
          <h1 id="pricing-h" className="mt-4 text-[clamp(2.35rem,4.2vw,3.9rem)] leading-[1.04]">
            Every option starts with a free <span className="whitespace-nowrap">15-minute</span> call.
          </h1>
        </Wrap>
      </section>

      <Band id="mcat" labelledBy="pricing-mcat-h">
        <Kicker>MCAT Prep</Kicker>
        <H2 id="pricing-mcat-h" className="mt-3">
          MCAT pricing
        </H2>
        <div className="mt-10">
          <PlanCards />
        </div>
        <PaymentNote className="mt-8" />
      </Band>

      <Band tone="mist" id="admissions" labelledBy="pricing-adm-h">
        <Kicker>College Admissions</Kicker>
        <H2 id="pricing-adm-h" className="mt-3">
          Admissions pricing
        </H2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {admissionsPricing.map((p) => (
            <Card key={p.name} className="flex flex-col">
              <h3 className="text-[1.25rem]">{p.name}</h3>
              <p className="mt-4 text-[1.75rem] font-bold tracking-[-0.02em] text-hema">{p.price ?? "Priced on your consult call"}</p>
              {p.includes && <p className="mt-3 text-[1.0625rem] text-quiet">{p.includes}</p>}
            </Card>
          ))}
        </div>
        <PaymentNote className="mt-8" />
        <div className="mt-10">
          <ButtonLink href="/book">Book a free 15-min call</ButtonLink>
        </div>
      </Band>
    </>
  );
}
