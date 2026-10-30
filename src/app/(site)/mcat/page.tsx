import type { Metadata } from "next";
import Link from "next/link";
import { BookingBand } from "@/components/b/booking-band";
import { LessonExplorer, type Reading } from "@/components/b/lesson-explorer";
import { Band, ButtonLink, H2, Kicker, Lead, PaymentNote, Rows, TextLink, Wrap } from "@/components/b/primitives";
import { ScoreInstrument } from "@/components/home/score-instrument";
import { MesolimbicPathway } from "@/components/molecule/mesolimbic-pathway";
import { ReactionScheme } from "@/components/molecule/reaction-scheme";
import { Skeletal } from "@/components/molecule/skeletal";
import { ExamPreview } from "@/components/site/exam-preview";
import { PlanCards } from "@/components/site/plan-cards";
import { mcatScore, mcatTutoring, notes } from "@/lib/founder-facts";
import { practiceOrTutoring } from "@/lib/availability";
import { MOLECULES, keyBondLengths, roles } from "@/lib/molecules/analyze";
import { getAvailability, getPublishedExams, getPublishedResources } from "@/lib/public-data";
import { AAMC_DISCLAIMER, founder, sectionShort, type SectionCode } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const a = await getAvailability();
  // Search results list only the free tools that are actually open.
  const free = [a.practice && "a free practice test", "a free dopamine lesson", a.notes && "free notes"].filter(Boolean);
  const list = free.length > 1 ? `${free.slice(0, -1).join(", ")} and ${free.at(-1)}` : (free[0] ?? "");
  return {
    title: "MCAT Prep",
    description: `${mcatTutoring.headline} 1:1 MCAT tutoring on Zoom for C/P, B/B and P/S${list ? `, ${list}` : ""}.`,
    alternates: { canonical: "/mcat" },
  };
}

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
        <dl className="grid grid-cols-3 gap-4 border-t border-hairline pt-6">
          {measures.map((m) => (
            <div key={m.label}>
              <dt className="text-sm text-quiet">{m.label}</dt>
              <dd className="mt-1 font-display text-[1.6rem] leading-none text-hema">{m.angstrom.toFixed(3)} Å</dd>
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
  const [exams, resources] = await Promise.all([getPublishedExams(), getPublishedResources()]);
  // Practice links only while a set is published; until then the tutoring section (src/lib/availability.ts).
  const second = practiceOrTutoring(await getAvailability(), "Start a free practice test", "#tutoring");
  const noteLinks = new Map(resources.filter((x) => x.kind === "NOTES").map((x) => [x.section, x.url]));

  return (
    <>
      <section aria-labelledby="mcat-h" className="bg-white pb-24 pt-12 sm:pb-32 sm:pt-20">
        <Wrap className="grid items-center gap-x-20 gap-y-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Kicker>MCAT Prep</Kicker>
            <h1 id="mcat-h" className="mt-5 text-[clamp(2.6rem,4.8vw,4.4rem)] leading-[1.03]">
              {mcatTutoring.headline}
            </h1>
            <p className="mt-7 text-[1.125rem] leading-relaxed text-quiet">{mcatScore.line}.</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <ButtonLink href="/book?service=mcat">Book a free consult call</ButtonLink>
              <TextLink href={second.href}>{second.label}</TextLink>
            </div>
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-8 sm:p-11">
            <ScoreInstrument total={founder.mcat.total} sections={founder.mcat.sections} taken={founder.mcat.taken} />
          </div>
        </Wrap>
      </section>

      <Band tone="mist" id="tutoring" labelledBy="tutoring-h">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <Kicker>MCAT tutoring</Kicker>
            <H2 id="tutoring-h" className="mt-4">
              One-on-one, built around your test date.
            </H2>
          </div>
          <Rows items={mcatTutoring.points} size="lg" />
        </div>
      </Band>

      <Band id="lesson" labelledBy="lesson-h">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-24">
          <div>
            <Kicker>Free interactive lesson</Kicker>
            <H2 id="lesson-h" className="mt-4">
              One molecule, three sections.
            </H2>
          </div>
          <Lead>
            Dopamine is tested in all three science sections. Read it each way, then take the free lesson: a question per section, the reasoning after
            every answer, and a retest on each idea.
          </Lead>
        </div>
        <div className="mt-14">
          <LessonExplorer readings={readings} />
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <ButtonLink href="/dopamine">Read the free dopamine lesson</ButtonLink>
        </div>
      </Band>

      <Band tone="mist" id="practice" labelledBy="practice-h">
        <div className="grid items-start gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <Kicker>Free practice platform</Kicker>
            <H2 id="practice-h" className="mt-4">
              Practice in a test-day interface.
            </H2>
            {/* Not founder-facts' practicePlatform: that is the spec's build brief, in the present tense, and full-length
                sections don't exist yet. Whether sample sets are open is said on the next line, from published data. */}
            <Lead className="mt-6">
              Built for full-length C/P, B/B and P/S sections, in an exam-style interface: passage on the left, question on the right, answer
              choices, timer, flag-for-review, question navigator, and a results screen with score and an explanation for every question.
            </Lead>
            <p className="mt-6 text-[1rem] text-specimen/85">
              {exams.some((e) => e.underReview)
                ? "Available now: a full-length practice test (C/P, B/B and P/S), being reviewed by Shabari."
                : exams.length > 0
                ? "Available now: short sample sets. Full-length C/P, B/B and P/S sections are coming."
                : "Practice sets are coming soon: the first short sample sets open here once Shabari has reviewed them, then full-length C/P, B/B and P/S sections as she adds her questions."}
            </p>
            {exams.length > 0 && (
              <ul className="mt-8 border-t border-hairline">
                {exams.map((e) => (
                  <li key={e.slug} className="border-b border-hairline">
                    <Link href={`/practice/${e.slug}`} className="group flex items-baseline justify-between gap-4 py-4">
                      <span className="font-display text-[1.25rem] text-hema group-hover:text-eosin-ink">{e.title}</span>
                      <span className="shrink-0 text-sm text-quiet">{sectionShort[e.section as SectionCode]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {exams.length > 0 && (
              <TextLink href="/practice" className="mt-8">
                Start a free practice test
              </TextLink>
            )}
          </div>
          <div className="exam-surface lg:pt-16">
            <ExamPreview />
          </div>
        </div>
      </Band>

      <Band id="notes" labelledBy="notes-h">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <Kicker>Free MCAT notes</Kicker>
            <H2 id="notes-h" className="mt-4">
              {notes.headline}
            </H2>
          </div>
          <ul className="border-t border-hairline">
            {notes.cards.map((c) => {
              const url = noteLinks.get(c.section as SectionCode);
              return (
                <li key={c.section} className="grid gap-2 border-b border-hairline py-6 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8">
                  <div>
                    <h3 className="text-[1.5rem]">{c.title}</h3>
                    <p className="mt-1 text-[1.0625rem] text-quiet">{c.body}</p>
                  </div>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-hema underline decoration-hema/25 decoration-2 underline-offset-[6px] hover:decoration-eosin">
                      Open notes
                    </a>
                  ) : (
                    <span className="text-[0.98rem] font-medium text-quiet">Coming soon</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Band>

      <Band tone="mist" id="mcat-pricing" labelledBy="mcat-pricing-h">
        <Kicker>MCAT pricing</Kicker>
        <H2 id="mcat-pricing-h" className="mt-4">
          Every option starts with a free call.
        </H2>
        <div className="mt-14">
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
