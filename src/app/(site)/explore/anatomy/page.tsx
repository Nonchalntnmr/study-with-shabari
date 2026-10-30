import type { Metadata } from "next";
import { BookingBand } from "@/components/b/booking-band";
import { Band, ButtonLink, Kicker, Lead, TextLink, Wrap } from "@/components/b/primitives";
import { AnatomyExplorer } from "@/components/explore/anatomy-explorer";

export const metadata: Metadata = {
  title: "3D Organ Systems Explorer",
  description:
    "Interactive 3D human organ systems atlas for the MCAT: cardiovascular, respiratory, digestive, endocrine, and renal physiology.",
  alternates: { canonical: "/explore/anatomy" },
};

export default function AnatomyExplorerPage() {
  return (
    <div>
      <section aria-labelledby="anatomy-h" className="bg-white pb-12 pt-8 sm:pb-16 sm:pt-14">
        <Wrap>
          <Kicker>MCAT Biological &amp; Biochemical Foundations · 3D Atlas</Kicker>
          <h1 id="anatomy-h" className="mt-4 max-w-[19ch] text-[clamp(2.2rem,5vw,4.35rem)] leading-[1.03]">
            Explore the organ systems, from heart and lungs to nephron and gut.
          </h1>
          <Lead className="mt-5 max-w-2xl">
            Turn the 3D reference organs or pick a system to review gas exchange, acid-base balance, digestion, hormone regulation, and renal filtration for the MCAT.
          </Lead>
          <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4 sm:mt-8">
            <ButtonLink href="/book?service=mcat">Book a free consult call</ButtonLink>
            <TextLink href="/explore/brain">Explore the 3D brain atlas</TextLink>
          </div>
        </Wrap>
      </section>

      <Band id="atlas" labelledBy="anatomy-h" className="pt-4 sm:pt-6">
        <AnatomyExplorer />
      </Band>

      <BookingBand service="mcat" />
    </div>
  );
}
