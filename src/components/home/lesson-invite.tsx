import Link from "next/link";
import { DraftBadge } from "@/components/lesson/badges";
import { getFeaturedLesson } from "@/lib/public-data";

/** After the story: the same molecule as a short lesson. Renders nothing until a version is approved (or in previews). */
export async function LessonInvite() {
  const lesson = await getFeaturedLesson();
  if (!lesson) return null;
  return (
    <section aria-labelledby="lesson-h" className="border-y border-hairline bg-[#F6F8F7]">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div>
          {lesson.draft && <DraftBadge />}
          <h2 id="lesson-h" className="mt-6 max-w-3xl text-[clamp(2.5rem,5vw,4.5rem)]">
            Now try it yourself.
          </h2>
        </div>
        <div className="space-y-8">
          <p className="max-w-[46ch] text-[1.125rem] leading-relaxed text-specimen/90">
            A short lesson on the same molecule: {lesson.questions} questions across the three science sections, the reasoning after every answer, and a
            second question on each idea to check it stuck.
          </p>
          <Link
            href={`/lessons/${lesson.slug}`}
            className="inline-flex h-12 items-center rounded-full bg-eosin px-7 text-[1rem] font-semibold text-specimen transition-colors hover:bg-[#E46C91]"
          >
            Start the dopamine lesson
          </Link>
        </div>
      </div>
    </section>
  );
}
