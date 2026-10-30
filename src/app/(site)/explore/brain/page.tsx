import type { Metadata } from "next";
import { BookingBand } from "@/components/b/booking-band";
import { Band, ButtonLink, Kicker, Lead, TextLink, Wrap } from "@/components/b/primitives";
import { BrainExplorer } from "@/components/explore/brain-explorer";

export const metadata: Metadata = {
  title: "3D Brain Explorer",
  description:
    "Interactive 3D human brain atlas for the MCAT: lobes, cortical areas, limbic system, basal ganglia, dopamine pathways, brainstem, and cerebellum.",
  alternates: { canonical: "/explore/brain" },
};

export default function BrainExplorerPage() {
  return (
    <div>
      <section aria-labelledby="brain-h" className="bg-white pb-12 pt-8 sm:pb-16 sm:pt-14">
        <Wrap>
          <Kicker>MCAT Biology &amp; Psychology/Sociology · 3D Atlas</Kicker>
          <h1 id="brain-h" className="mt-4 max-w-[18ch] text-[clamp(2.2rem,5vw,4.35rem)] leading-[1.03]">
            Explore the brain, lobe by lobe and deep inside.
          </h1>
          <Lead className="mt-5 max-w-2xl">
            Pick a lobe, cortical area, or deep structure to turn the 3D atlas, see what it does, and connect it to MCAT questions and dopamine pathways.
          </Lead>
          <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4 sm:mt-8">
            <ButtonLink href="/book?service=mcat">Book a free consult call</ButtonLink>
            <TextLink href="/dopamine">Explore the free dopamine lesson</TextLink>
          </div>
        </Wrap>
      </section>

      <Band id="atlas" labelledBy="brain-h" className="pt-4 sm:pt-6">
        <BrainExplorer />
      </Band>

      <BookingBand service="mcat" />
    </div>
  );
}
