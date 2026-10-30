import { bio, mcatTutoring } from "@/lib/founder-facts";
import { SCALE, SCORE, SCORE_TAKEN, SCORE_TEXT, SECTIONS } from "@/lib/experience/score";

// Credibility, plainly: the 522 on its scale (no section scores; src/lib/experience/score.ts) and
// her approach in her words. Static, so it is the same with WebGL off or motion reduced.

const APPROACH = bio.slice(bio.indexOf("I remember"));

export function ScoreBand() {
  const pct = ((SCORE - SCALE.min) / (SCALE.max - SCALE.min)) * 100;
  const ticks = Array.from({ length: SCALE.max - SCALE.min + 1 }, (_, i) => SCALE.min + i);
  return (
    <section aria-labelledby="score-h" className="border-y border-[color:var(--exp-rule)] bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-20">
        <div>
          <p className="exp-label-caps text-[color:var(--exp-quiet)]">MCAT · {SCORE_TAKEN}</p>
          <p className="sr-only">{SCORE_TEXT}</p>
          <p aria-hidden className="mt-5 font-display text-[clamp(7rem,20vw,15rem)] leading-[0.9] tracking-[-0.045em] text-hema">
            {SCORE}
          </p>
          <figure className="mt-8 max-w-xl" aria-label={`${SCORE} on the MCAT, ${SCORE_TAKEN}. ${SCALE.line}`}>
            <div aria-hidden className="relative h-10">
              <div className="absolute inset-x-0 bottom-0 flex justify-between">
                {ticks.map((t) => (
                  <span key={t} className={`w-px bg-hema/45 ${t % 10 === 0 ? "h-5" : "h-2"}`} />
                ))}
              </div>
              <div className="absolute bottom-0 left-0 h-[3px] bg-hema" style={{ width: `${pct}%` }} />
              <div className="absolute -bottom-1.5 h-6 w-[10px] -translate-x-1/2 rounded-sm bg-eosin" style={{ left: `${pct}%` }} />
            </div>
            <figcaption className="mt-2 flex justify-between text-[0.9rem] tabular-nums text-[color:var(--exp-quiet)]">
              <span>{SCALE.min}</span>
              <span>{SCALE.line}</span>
              <span>{SCALE.max}</span>
            </figcaption>
          </figure>
          <ul aria-label="Section scores" className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
            {SECTIONS.map((s) => (
              <li key={s.code} className="flex items-baseline gap-2">
                <span className="font-display text-[2.2rem] leading-none text-hema">{s.value}</span>
                <span className="text-[0.95rem] font-semibold text-[color:var(--exp-quiet)]">{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 id="score-h" className="text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.08]">
            {mcatTutoring.headline}
          </h2>
          <blockquote className="mt-6 border-l-2 border-hema pl-5 text-[1.125rem] leading-relaxed text-specimen/90">“{APPROACH}”</blockquote>
        </div>
      </div>
    </section>
  );
}
