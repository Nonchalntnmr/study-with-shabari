import type { Metadata } from "next";
import Link from "next/link";
import { LessonExplorer, type Reading } from "@/components/b/lesson-explorer";
import { BookingBand } from "@/components/b/booking-band";
import { Band, ButtonLink, Card, Checks, H2, Kicker, Lead, PaymentNote, Wrap } from "@/components/b/primitives";
import { ScoreInstrument } from "@/components/home/score-instrument";
import { DraftBadge } from "@/components/lesson/badges";
import { MesolimbicPathway } from "@/components/molecule/mesolimbic-pathway";
import { ReactionScheme } from "@/components/molecule/reaction-scheme";
import { Skeletal } from "@/components/molecule/skeletal";
import { ExamPreview } from "@/components/site/exam-preview";
import { PlanCards } from "@/components/site/plan-cards";
import { mcatScore, mcatTutoring, notes, practicePlatform } from "@/lib/founder-facts";
import { MOLECULES, keyBondLengths, roles } from "@/lib/molecules/analyze";
import { getFeaturedLesson, getPublishedExams, getPublishedResources } from "@/lib/public-data";
import { AAMC_DISCLAIMER, founder, sectionShort, type SectionCode } from "@/lib/site";

export const metadata: Metadata = {
  title: "MCAT Prep",
  description: `${mcatTutoring.headline} 1:1 MCAT tutoring on Zoom for C/P, B/B and P/S, a free practice test, a free interactive lesson and free notes.`,
  alternates: { canonical: "/mcat" },
};

const dopamine = MOLECULES.dopamine;
const measures = keyBondLengths(dopamine);
const r = roles(dopamine);

const readings: Reading[] = [
  {
    id: "cp",
    tab: "Chem/Phys",
    section: "Chemical and Physical Foundations",
    title: "Read it as a chemist",
    body: (
      <>
        <p>
          Dopamine is a catechol: a benzene ring carrying two neighbouring hydroxyl groups, with an ethylamine side chain. The ring is aromatic, flat
          with six delocalised π electrons, so its six carbon–carbon bonds come out essentially the same length. At physiological pH the amine is
          protonated, so dopamine carries a positive charge.
        </p>
        <dl className="grid grid-cols-3 gap-3 border-t border-hairline pt-5">
          {measures.map((m) => (
            <div key={m.label}>
              <dt className="text-sm text-quiet">{m.label}</dt>
              <dd className="mt-1 text-xl font-bold text-hema">{m.angstrom.toFixed(3)} Å</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-quiet">Measured from PubChem’s computed 3D conformer of dopamine (CID 681).</p>
      </>
    ),
    figure: (
      <Skeletal
        molecule={dopamine}
        title="Skeletal structure of dopamine with the aromatic ring and amine highlighted"
        highlight={[...r.ring, ...r.amine]}
        highlightColor="#0B7F7B"
        className="mx-auto w-full max-w-sm"
      />
    ),
  },
  {
    id: "bb",
    tab: "Bio/Biochem",
    section: "Biological and Biochemical Foundations",
    title: "Read it as a biochemist",
    body: (
      <p>
        Neurons build dopamine from the amino acid tyrosine in two steps. Tyrosine hydroxylase adds a second hydroxyl group to the ring, giving L-DOPA,
        and it is the rate-limiting step. Aromatic L-amino acid decarboxylase then removes the carboxyl group as carbon dioxide.
      </p>
    ),
    figure: <ReactionScheme step={3} />,
  },
  {
    id: "ps",
    tab: "Psych/Soc",
    section: "Psychological, Social, and Biological Foundations of Behavior",
    title: "Read it as a psychologist",
    body: (
      <p>
        Dopamine neurons in the ventral tegmental area project to the nucleus accumbens. This mesolimbic pathway is central to reward, motivation and
        reinforcement learning. A second projection, the mesocortical pathway, reaches the prefrontal cortex.
      </p>
    ),
    figure: <MesolimbicPathway className="w-full" />,
  },
];

export default async function McatPage() {
  const [lesson, exams, resources] = await Promise.all([getFeaturedLesson(), getPublishedExams(), getPublishedResources()]);
  const noteLinks = new Map(resources.filter((x) => x.kind === "NOTES").map((x) => [x.section, x.url]));

  return (
    <>
      <section aria-labelledby="mcat-h" className="bg-white pb-20 pt-10 sm:pb-28 sm:pt-16">
        <Wrap className="grid items-center gap-x-16 gap-y-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Kicker>MCAT Prep</Kicker>
            <h1 id="mcat-h" className="mt-4 text-[clamp(2.35rem,4.2vw,3.9rem)] leading-[1.04]">
              {mcatTutoring.headline}
            </h1>
            <p className="mt-6 text-[1.125rem] leading-relaxed text-quiet">{mcatScore.line}.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/book?service=mcat">Book a free 15-min call</ButtonLink>
              <ButtonLink href="/practice" variant="secondary">
                Start a free practice test
              </ButtonLink>
            </div>
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-7 sm:p-10">
            <ScoreInstrument total={founder.mcat.total} sections={founder.mcat.sections} taken={founder.mcat.taken} />
          </div>
        </Wrap>
      </section>

      <Band tone="mist" id="tutoring" labelledBy="tutoring-h">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <Kicker>MCAT tutoring</Kicker>
            <H2 id="tutoring-h" className="mt-3">
              One-on-one, built around your test date.
            </H2>
          </div>
          <Checks items={mcatTutoring.points} />
        </div>
      </Band>

      <Band id="lesson" labelledBy="lesson-h">
        <Kicker>Free interactive lesson</Kicker>
        <H2 id="lesson-h" className="mt-3">
          One molecule, three sections.
        </H2>
        <Lead className="mt-5">
          Dopamine is tested in all three science sections. Read it each way, then take the free lesson: a question per section, the reasoning after
          every answer, and a retest on each idea.
        </Lead>
        <div className="mt-10">
          <LessonExplorer readings={readings} />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {lesson ? (
            <>
              <ButtonLink href={`/lessons/${lesson.slug}`}>Start the free lesson</ButtonLink>
              {lesson.draft && <DraftBadge />}
            </>
          ) : (
            <p className="text-[1.0625rem] text-quiet">The interactive lesson opens here once Shabari has reviewed it.</p>
          )}
        </div>
      </Band>

      <Band tone="mist" id="practice" labelledBy="practice-h">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <Kicker>Free practice platform</Kicker>
            <H2 id="practice-h" className="mt-3">
              Practice in a test-day interface.
            </H2>
            <Lead className="mt-5">{practicePlatform}</Lead>
            <p className="mt-6 rounded-xl border border-hairline bg-white px-5 py-4 text-[1rem] text-specimen/85">
              Available now: short sample sets. Full-length C/P, B/B and P/S sections are coming as Shabari adds her questions.
            </p>
            {exams.length > 0 && (
              <ul className="mt-6 divide-y divide-hairline rounded-xl border border-hairline bg-white">
                {exams.map((e) => (
                  <li key={e.slug}>
                    <Link href={`/practice/${e.slug}`} className="flex items-baseline justify-between gap-4 px-5 py-4 hover:bg-mist">
                      <span className="font-semibold text-hema">{e.title}</span>
                      <span className="shrink-0 text-sm text-quiet">{sectionShort[e.section as SectionCode]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8">
              <ButtonLink href="/practice">Start a free practice test</ButtonLink>
            </div>
          </div>
          <div className="exam-surface lg:pt-14">
            <ExamPreview />
          </div>
        </div>
      </Band>

      <Band id="notes" labelledBy="notes-h">
        <Kicker>Free MCAT notes</Kicker>
        <H2 id="notes-h" className="mt-3">
          {notes.headline}
        </H2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {notes.cards.map((c) => {
            const url = noteLinks.get(c.section as SectionCode);
            return (
              <Card key={c.section} className="flex flex-col">
                <h3 className="text-[1.4rem]">{c.title}</h3>
                <p className="mt-3 flex-1 text-[1.0625rem] text-quiet">{c.body}</p>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="mt-7 font-semibold text-eosin underline decoration-eosin/30 underline-offset-4">
                    Open notes
                  </a>
                ) : (
                  <p className="mt-7 font-medium text-quiet">Coming soon</p>
                )}
              </Card>
            );
          })}
        </div>
      </Band>

      <Band tone="mist" id="mcat-pricing" labelledBy="mcat-pricing-h">
        <Kicker>MCAT pricing</Kicker>
        <H2 id="mcat-pricing-h" className="mt-3">
          Every option starts with a free call.
        </H2>
        <div className="mt-12">
          <PlanCards />
        </div>
        <PaymentNote className="mt-8" />
      </Band>

      <BookingBand service="mcat" />
      <Wrap className="py-8">
        <p className="text-sm text-quiet">{AAMC_DISCLAIMER}</p>
      </Wrap>
    </>
  );
}
