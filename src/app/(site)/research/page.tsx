import type { Metadata } from "next";
import { Band, H2, Kicker, Rows, Wrap } from "@/components/b/primitives";
import { honors, mentoring, mudzi, publications, research, teaching, writing } from "@/lib/founder-facts";

export const metadata: Metadata = {
  title: "Research & Teaching",
  description: "Research at the Ragon Institute, MIT CSAIL, Beth Israel Lahey Health, the Utah Health Policy Project and NASA L'SPACE; publications; teaching and mentoring; honors; and the Mudzi Cooking Project.",
  alternates: { canonical: "/research" },
};

export default function ResearchPage() {
  return (
    <>
      <section aria-labelledby="research-h" className="border-b border-hairline bg-mist pb-16 pt-10 sm:pb-20 sm:pt-16">
        <Wrap>
          <Kicker>Research & Teaching</Kicker>
          <h1 id="research-h" className="mt-4 max-w-4xl text-[clamp(2.35rem,4.2vw,3.9rem)] leading-[1.04]">
            Immunology, computational genomics, surgical sustainability, and teaching at MIT.
          </h1>
        </Wrap>
      </section>

      <Band labelledBy="timeline-h">
        <H2 id="timeline-h">Research</H2>
        <ol className="relative mt-12 grid gap-10 border-l border-hairline pl-8 sm:pl-12">
          {research.map((r) => (
            <li key={r.org} className="relative">
              <span aria-hidden className="absolute -left-[2.3rem] top-2 size-3 rounded-full bg-eosin ring-4 ring-white sm:-left-[3.3rem]" />
              <p className="text-[0.95rem] font-semibold tabular-nums text-quiet">{r.when ?? " "}</p>
              <h3 className="mt-1 text-[1.6rem]">{r.org}</h3>
              <p className="mt-2 max-w-[70ch] text-[1.0625rem] leading-relaxed text-specimen/85">{r.body}</p>
            </li>
          ))}
        </ol>
      </Band>

      <Band tone="mist" labelledBy="pubs-h">
        <H2 id="pubs-h">Publications</H2>
        <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
          {publications.map((p) => (
            <li key={p.title} className="grid gap-1 py-5 sm:grid-cols-[9rem_1fr] sm:gap-8">
              <span className="text-[0.95rem] font-semibold tabular-nums text-quiet">{p.when}</span>
              <span className="text-[1.0625rem] text-specimen">
                {p.title}, <span className="text-quiet">{p.venue}</span>
              </span>
            </li>
          ))}
        </ul>
      </Band>

      <Band labelledBy="teach-h">
        <div className="grid gap-14 lg:grid-cols-2">
          <div>
            <H2 id="teach-h">Teaching & mentoring</H2>
            <Rows items={[...teaching, ...mentoring.filter((m) => !teaching.includes(m))]} className="mt-8" />
            <h3 className="mt-12 text-[1.6rem]">Writing</h3>
            <p className="mt-4 max-w-[62ch] text-[1.0625rem] leading-relaxed text-specimen/85">{writing}</p>
          </div>
          <div>
            <h2 className="text-[clamp(2rem,3.4vw,3rem)]">Honors</h2>
            <Rows items={honors} className="mt-8" />
          </div>
        </div>
      </Band>

      <Band tone="mist" id="mudzi" labelledBy="mudzi-h">
        <Kicker>Founder</Kicker>
        <H2 id="mudzi-h" className="mt-3">
          {mudzi.name}
        </H2>
        <p className="mt-5 max-w-[70ch] text-[1.125rem] leading-relaxed text-specimen/85">{mudzi.body}</p>
        <dl className="mt-10 grid gap-5 sm:grid-cols-3">
          {mudzi.figures.map((f) => (
            <div key={f.label} className="flex flex-col border-t-2 border-hema pt-5">
              <dt className="mt-2 text-[0.98rem] text-quiet">{f.label}</dt>
              <dd className="order-first font-display text-[3rem] leading-none text-hema">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[1.0625rem] text-specimen/85">{mudzi.more}</p>
      </Band>
    </>
  );
}
