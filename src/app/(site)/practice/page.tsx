import { Clock, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResumeList } from "@/components/site/resume-list";
import { clearGuestHistory } from "@/lib/auth/actions";
import { ReviewNotice, REVIEW_LABEL } from "@/components/site/review-notice";
import { Container, PageIntro } from "@/components/site/section";
import { getPublishedExams } from "@/lib/public-data";
import { AAMC_DISCLAIMER, sectionNames, sectionShort, type SectionCode } from "@/lib/site";

export const metadata: Metadata = {
  title: "Free MCAT practice sets",
  description: "Original MCAT-style passage and discrete questions with full explanations, timed or untimed, no account needed.",
  alternates: { canonical: "/practice" },
};

export default async function PracticePage() {
  const exams = await getPublishedExams();
  const sections = (["CP", "BB", "PS", "CARS"] as SectionCode[]).filter((s) => exams.some((e) => e.section === s));
  return (
    <>
      <PageIntro eyebrow="Practice" title="Practice like it’s test day.">
        {exams.length > 0
          ? "Original passage-style questions with full explanations. Start anywhere. No account needed."
          : "Original passage-style questions with full explanations, free and with no account needed. The first sets open here once they’ve been reviewed."}
      </PageIntro>
      <section className="py-14">
        <Container className="space-y-12">
          <Suspense fallback={null}>
            <ResumeList />
          </Suspense>
          {exams.some((e) => e.underReview) && <ReviewNotice />}
          {exams.length === 0 ? (
            <p className="text-lg text-muted-foreground">New practice sets are on the way. Check back soon.</p>
          ) : (
            sections.map((s) => (
              <div key={s}>
                <h2 className="mb-1 text-2xl font-semibold">{sectionShort[s]}</h2>
                <p className="mb-5 text-sm text-muted-foreground">{sectionNames[s]}</p>
                <ul className="grid gap-4 md:grid-cols-2">
                  {exams
                    .filter((e) => e.section === s)
                    .map((e) => (
                      <li key={e.slug}>
                        <Link href={`/practice/${e.slug}`} className="group block h-full rounded-2xl border bg-white p-6 transition hover:border-navy/40 hover:shadow-md">
                          <h3 className="text-lg font-semibold group-hover:text-blue">{e.title}</h3>
                          {e.underReview && <p className="mt-1 text-xs font-medium text-amber-800">{REVIEW_LABEL}</p>}
                          <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>
                          <p className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <FileText className="size-3.5" aria-hidden /> {e.questionCount} questions
                              {e.passageCount ? ` · ${e.passageCount} passage${e.passageCount === 1 ? "" : "s"}` : ""}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3.5" aria-hidden /> {Math.round(e.timeLimitSec / 60)} min timed
                            </span>
                          </p>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground">
            <p className="max-w-3xl">{AAMC_DISCLAIMER}</p>
            <form action={clearGuestHistory}>
              <button type="submit" className="underline underline-offset-2 hover:text-navy">
                Clear guest practice and lesson history on this browser
              </button>
            </form>
          </div>
        </Container>
      </section>
    </>
  );
}
