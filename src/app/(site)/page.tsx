import type { Metadata } from "next";
import { StoryScroll } from "@/components/cinema/story-scroll";
import { Chapters } from "@/components/home/chapters";
import { LessonInvite } from "@/components/home/lesson-invite";
import { PracticeSection } from "@/components/home/practice-section";
import { FinalCta, Founder, HowIHelp, PricingTeaser, PrimaryCta, SecondaryCta, TheScore } from "@/components/home/sections";
import { DesktopStage, MobileStage } from "@/components/home/stage-slots";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <StoryScroll>
        <div className="stage-layer" aria-hidden>
          <div className="stage-pin" data-stage>
            <DesktopStage />
          </div>
        </div>
        <section aria-labelledby="hero-h" className="hero relative z-10 flex min-h-svh flex-col justify-center pb-16 pt-28 md:pb-10">
          <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
            <div className="hero-copy md:w-[52%] lg:w-[50%]">
              {/* Two even lines at every width: "MCAT tutoring / from a 522 scorer." The phone size is set so the longer line fits from 320px up. */}
              <h1 id="hero-h" className="text-[clamp(2.25rem,11.2vw,3rem)] leading-[0.98] [text-wrap:balance] md:text-[clamp(3rem,5.6vw,5.5rem)]">
                <span className="block">MCAT tutoring </span>
                <span className="block md:whitespace-nowrap">from a 522 scorer.</span>
              </h1>
              <p className="mt-8 max-w-[34rem] text-[1.1875rem] leading-relaxed text-specimen/90">
                I’m Shabari, an MIT student in biochemistry and computational neuroscience. I scored 522 on the MCAT in January 2026. My notes and
                practice sets are free, and I tutor the three science sections.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <PrimaryCta />
                <SecondaryCta />
              </div>
              <MobileStage />
            </div>
          </div>
          <p className="absolute bottom-6 right-8 hidden max-w-[22rem] text-right text-sm text-quiet md:block">
            Dopamine, C₈H₁₁NO₂. Atom positions from PubChem’s 3D conformer (CID 681).
          </p>
        </section>
        <Chapters />
      </StoryScroll>
      <LessonInvite />
      <HowIHelp />
      <TheScore />
      <PracticeSection />
      <Founder />
      <PricingTeaser />
      <FinalCta />
    </>
  );
}
