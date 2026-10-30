import type { Metadata } from "next";
import Link from "next/link";
import { gateExperience } from "@/lib/experience/gate";

export const instant = false;
export const metadata: Metadata = { title: "The Beauty of Intelligence", description: "Prototype index: three hero directions, a vertical slice and an admissions world." };

const DIRECTIONS = [
  {
    href: "/experience/specimen",
    n: "I",
    name: "Specimen",
    line: "Dopamine as a lit museum specimen. Scroll takes it apart by functional group, adds the proton it carries at pH 7.4, and puts it back together.",
    tech: "WebGL, PubChem conformer, vectors computed from the structure",
  },
  {
    href: "/experience/synapse",
    n: "II",
    name: "Synapse",
    line: "The same molecule as a neurotransmitter: vesicle release, the cleft, D1 (Gs, cAMP up) against D2 (Gi, cAMP down), then reuptake by DAT. Block DAT and watch it stay.",
    tech: "WebGL, one instanced molecule per particle",
  },
  {
    href: "/experience/instrument",
    n: "III",
    name: "Instrument",
    line: "An editorial 522 reveal in kinetic type, then her teaching approach in her own words.",
    tech: "HTML and CSS only, no WebGL",
  },
];

export default function ExperienceIndex() {
  gateExperience();
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-12 sm:px-8 sm:pt-20">
      <p className="exp-label-caps text-[color:var(--exp-quiet)]">Prototypes · not part of the live site</p>
      <h1 className="mt-4 max-w-4xl text-[clamp(2.5rem,6vw,5.2rem)] leading-[0.98]">The Beauty of Intelligence</h1>
      <p className="mt-6 max-w-2xl text-[1.125rem] leading-relaxed text-[color:var(--exp-quiet)]">
        Three hero directions for Study with Shabari, each a working route. They are compared, with measurements, in docs/EXPERIENCE.md.
      </p>

      <ol className="mt-14 grid border-t border-[color:var(--exp-rule)] lg:grid-cols-3">
        {DIRECTIONS.map((d, i) => (
          <li key={d.href} className={`border-b border-[color:var(--exp-rule)] lg:border-b-0 ${i > 0 ? "lg:border-l" : ""}`}>
            <Link href={d.href} className="group flex h-full flex-col gap-4 p-6 transition-colors hover:bg-white/70 sm:p-8">
              <span className="font-display text-[1.1rem] text-[color:var(--exp-quiet)]">{d.n}</span>
              <span className="font-display text-[clamp(2rem,3.4vw,2.8rem)] leading-none text-hema group-hover:underline group-hover:decoration-2 group-hover:underline-offset-8">{d.name}</span>
              <span className="text-[1.05rem] leading-relaxed text-specimen/90">{d.line}</span>
              <span className="mt-auto pt-4 text-[0.9rem] text-[color:var(--exp-quiet)]">{d.tech}</span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        <Link href="/experience/slice" className="group rounded-2xl bg-hema p-8 text-white">
          <span className="exp-label-caps text-white/75">Vertical slice</span>
          <span className="mt-3 block font-display text-[2rem] leading-tight text-white">Specimen → Synapse → 522 → a question → booking</span>
          <span className="mt-3 block text-white/85">The strongest direction as one complete sequence, with one of Shabari’s six dopamine questions.</span>
        </Link>
        <Link href="/experience/admissions" className="exp-paper group rounded-2xl p-8 ring-1 ring-[color:var(--exp-rule)]">
          <span className="exp-label-caps text-[color:var(--exp-quiet)]">Admissions</span>
          <span className="mt-3 block font-display text-[2rem] leading-tight text-hema">The application, as a journey</span>
          <span className="mt-3 block text-specimen/90">Essays, activities, school list, interviews and timeline, in a warm editorial world.</span>
        </Link>
      </div>
    </div>
  );
}
