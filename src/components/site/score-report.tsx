import { founder, sectionShort } from "@/lib/site";

const TOTAL_MIN = 472;
const TOTAL_MAX = 528;
const SECTION_MIN = 118;
const SECTION_MAX = 132;

const scale = (v: number, min: number, max: number) => `${(((v - min) / (max - min)) * 100).toFixed(1)}%`;

/** The founder's own score report. Numbers come only from `founder` in src/lib/site.ts. */
export function ScoreReport() {
  const { total, taken, sections } = founder.mcat;
  return (
    <figure
      aria-label={`${founder.shortName}'s MCAT score: ${total} out of ${TOTAL_MAX}`}
      className="animate-rise rounded-2xl border bg-white p-6 shadow-[0_1px_2px_rgba(16,37,75,0.04),0_12px_32px_-12px_rgba(16,37,75,0.18)] sm:p-7"
    >
      <figcaption className="text-sm font-medium text-muted-foreground">My MCAT score · {taken}</figcaption>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-6xl font-semibold tracking-[-0.04em] text-navy tabular-nums">{total}</span>
        <span className="text-muted-foreground">out of {TOTAL_MAX}</span>
      </div>
      <div className="relative mt-5 h-2.5 rounded-full bg-muted" aria-hidden>
        <div className="animate-grow absolute inset-y-0 left-0 rounded-full bg-mark" style={{ width: scale(total, TOTAL_MIN, TOTAL_MAX) }} />
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-navy shadow"
          style={{ left: scale(total, TOTAL_MIN, TOTAL_MAX) }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground" aria-hidden>
        <span>{TOTAL_MIN}</span>
        <span>{TOTAL_MAX}</span>
      </div>
      <dl className="mt-6 space-y-3 border-t pt-5">
        {(Object.entries(sections) as [keyof typeof sectionShort, number][]).map(([code, score]) => (
          <div key={code} className="grid grid-cols-[5.5rem_1fr_2.25rem] items-center gap-3 text-sm">
            <dt className="font-medium text-ink">{sectionShort[code]}</dt>
            <div className="relative h-2 rounded-full bg-muted" aria-hidden>
              <div className="animate-grow absolute inset-y-0 left-0 rounded-full bg-blue" style={{ width: scale(score, SECTION_MIN, SECTION_MAX) }} />
            </div>
            <dd className="text-right font-semibold tabular-nums text-navy">{score}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs text-muted-foreground">I tutor the three science sections.</p>
    </figure>
  );
}
