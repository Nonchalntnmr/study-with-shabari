import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResumeList } from "@/components/site/resume-list";
import { Container } from "@/components/site/section";
import { StartPracticeForm } from "@/components/site/start-practice-form";
import { getPublishedExam, getPublishedExams } from "@/lib/public-data";
import { AAMC_DISCLAIMER, sectionNames, type SectionCode } from "@/lib/site";

// Cache Components fails the build on an empty list, and a fresh database has no published sets
// (the samples wait in REVIEW). The placeholder renders the not-found page like any unknown slug.
export async function generateStaticParams() {
  const slugs = (await getPublishedExams()).map((e) => ({ slug: e.slug }));
  return slugs.length ? slugs : [{ slug: "_none" }];
}

export async function generateMetadata({ params }: PageProps<"/practice/[slug]">): Promise<Metadata> {
  const exam = await getPublishedExam((await params).slug);
  if (!exam) return { title: "Practice set not found" };
  return { title: exam.title, description: exam.description, alternates: { canonical: `/practice/${exam.slug}` } };
}

export default async function ExamDetailPage({ params }: PageProps<"/practice/[slug]">) {
  const exam = await getPublishedExam((await params).slug);
  if (!exam) notFound();
  const minutes = Math.round(exam.timeLimitSec / 60);
  return (
    <Container className="max-w-3xl py-14 sm:py-20">
      <Link href="/practice" className="text-sm text-muted-foreground hover:text-navy">
        ← All practice sets
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-blue">{sectionNames[exam.section as SectionCode]}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">{exam.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{exam.description}</p>
      <dl className="mt-8 grid grid-cols-3 divide-x rounded-2xl border bg-white text-center">
        {[
          ["Questions", exam.questionCount],
          ["Passages", exam.passageCount],
          ["Timed", `${minutes} min`],
        ].map(([k, v]) => (
          <div key={k} className="p-4">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-xl font-semibold text-navy">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 space-y-6">
        <Suspense fallback={null}>
          <ResumeList examSlug={exam.slug} heading="You have an unfinished attempt" />
        </Suspense>
        <StartPracticeForm examSlug={exam.slug} minutes={minutes} />
      </div>
      <div className="mt-10 rounded-2xl border bg-white p-5 text-sm text-muted-foreground">
        <p className="font-medium text-ink">In the exam you can</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Select passage text and press Highlight (Alt+H)</li>
          <li>Strike out answer choices you’ve ruled out</li>
          <li>Flag questions (Alt+F) and review them before you submit</li>
          <li>Move with Alt+N (next) and Alt+P (previous)</li>
        </ul>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">{AAMC_DISCLAIMER}</p>
    </Container>
  );
}
