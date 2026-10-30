import type { Metadata } from "next";
import { BookingBand } from "@/components/b/booking-band";
import { Band, ButtonLink, H2, Kicker, Lead, PaymentNote, TextLink, Wrap } from "@/components/b/primitives";
import { ActionPotentialExplorer } from "@/components/explore/action-potential-explorer";
import { ConductionExplorer } from "@/components/explore/conduction-explorer";
import { PumpExplorer } from "@/components/explore/pump-explorer";
import { ReceptorCompare } from "@/components/explore/receptor-compare";
import { SignalingQuiz } from "@/components/explore/signaling-quiz";
import { SynapseExplorer } from "@/components/explore/synapse-explorer";
import { LESSON, NEW } from "@/lib/explore/signaling-copy";
import { publicSignalingQuestions } from "@/lib/explore/signaling-questions";
import "./signaling.css";

export const metadata: Metadata = {
  title: "Neural Signaling Explorer",
  description: NEW.metaDescription,
  alternates: { canonical: "/explore/signaling" },
};

export default function SignalingPage() {
  const questions = publicSignalingQuestions();
  return (
    <div className="sig">
      <section aria-labelledby="sig-h" className="bg-white pb-16 pt-8 sm:pb-24 sm:pt-16">
        <Wrap>
          <Kicker>MCAT Biology &amp; Biochemistry · Interactive Explorer</Kicker>
          <h1 id="sig-h" className="mt-4 max-w-[18ch] text-[clamp(2.2rem,5vw,4.5rem)] leading-[1.03]">
            How neurons signal, from threshold to synapse.
          </h1>
          <Lead className="mt-5 max-w-2xl">{NEW.intro}</Lead>
          <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4 sm:mt-9">
            <ButtonLink href="/book?service=mcat">Book a free consult call</ButtonLink>
            <TextLink href="/dopamine">Explore the free dopamine lesson</TextLink>
          </div>
        </Wrap>
      </section>

      <Band tone="mist" id="action-potential" labelledBy="ap-h">
        <Kicker>1 · The action potential</Kicker>
        <H2 id="ap-h" className="mt-3">
          Resting potential, threshold, and all-or-none firing.
        </H2>
        <p className="mt-4 max-w-3xl text-[1.125rem] leading-relaxed text-specimen/90">{NEW.apLead}</p>
        <div className="mt-10">
          <ActionPotentialExplorer />
        </div>
        <div className="mt-10 grid gap-6 border-t border-hairline pt-8 md:grid-cols-2">
          <p className="text-[1.02rem] leading-relaxed text-specimen/90">{NEW.absolute}</p>
          <p className="text-[1.02rem] leading-relaxed text-specimen/90">{NEW.relative}</p>
        </div>
      </Band>

      <Band id="conduction" labelledBy="cond-h">
        <Kicker>2 · Conduction along the axon</Kicker>
        <H2 id="cond-h" className="mt-3">
          Myelin, nodes of Ranvier, and saltatory conduction.
        </H2>
        <p className="mt-4 max-w-3xl text-[1.125rem] leading-relaxed text-specimen/90">{NEW.myelinLead}</p>
        <p className="mt-2 max-w-3xl text-[1.02rem] leading-relaxed text-quiet">{NEW.myelinMakers}</p>
        <div className="mt-10">
          <ConductionExplorer />
        </div>
      </Band>

      <Band tone="mist" id="pump" labelledBy="pump-h">
        <Kicker>3 · Maintaining the gradients</Kicker>
        <H2 id="pump-h" className="mt-3">
          The Na⁺/K⁺-ATPase pump: 3 Na⁺ out, 2 K⁺ in.
        </H2>
        <p className="mt-4 max-w-3xl text-[1.125rem] leading-relaxed text-specimen/90">{NEW.pumpLead}</p>
        <p className="mt-2 max-w-3xl text-[1.02rem] font-medium text-hema">{NEW.pumpNot}</p>
        <div className="mt-10">
          <PumpExplorer />
        </div>
      </Band>

      <Band id="synapse" labelledBy="syn-h">
        <Kicker>4 · Across the synapse</Kicker>
        <H2 id="syn-h" className="mt-3">
          From electrical impulse to neurotransmitter release.
        </H2>
        <p className="mt-4 max-w-3xl text-[1.125rem] leading-relaxed text-specimen/90">{NEW.synapseLead}</p>
        <div className="mt-10">
          <SynapseExplorer />
        </div>
      </Band>

      <Band tone="mist" id="receptors" labelledBy="rec-h">
        <Kicker>5 · Receptors and signal termination</Kicker>
        <H2 id="rec-h" className="mt-3">
          Ionotropic vs. metabotropic receptors.
        </H2>
        <div className="mt-8">
          <ReceptorCompare />
        </div>
        <div className="mt-12 grid gap-6 border-t border-hairline pt-8 md:grid-cols-2">
          <div>
            <p className="text-[1.05rem] font-semibold text-hema">{NEW.reuptake}</p>
            <p className="mt-1 text-[0.98rem] text-quiet">{NEW.reuptakeExample}</p>
          </div>
          <div>
            <p className="text-[1.05rem] font-semibold text-hema">{NEW.enzymatic}</p>
            <p className="mt-1 text-[0.98rem] text-quiet">{NEW.enzymaticExample}</p>
          </div>
        </div>
      </Band>

      <Band id="check" labelledBy="check-h">
        <Kicker>6 · Check your understanding</Kicker>
        <H2 id="check-h" className="mt-3">
          {NEW.quizLead}
        </H2>
        <div className="mt-8 max-w-3xl">
          <SignalingQuiz questions={questions} />
        </div>
        <div className="mt-10 border-t border-hairline pt-6">
          <p className="text-[1.05rem] text-specimen">{LESSON.deeper}</p>
          <PaymentNote className="mt-2" />
        </div>
      </Band>

      <BookingBand service="mcat" />
    </div>
  );
}
