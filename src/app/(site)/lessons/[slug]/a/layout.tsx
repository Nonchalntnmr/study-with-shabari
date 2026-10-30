import { notFound } from "next/navigation";
import { getPublicLesson } from "@/lib/public-data";

// A lesson attempt lives under its lesson's public URL, so the same cached visibility check runs
// here, before the attempt (which needs the visitor's cookies) streams in: an unknown slug or an
// unapproved draft answers a real 404. Whether this visitor owns the attempt can only be known from
// the session, so a wrong or someone else's attempt id still gets the not-found page inside the
// stream, with a 200 and noindex.
export const unstable_paramMatching = { slug: "blocking" } as const;

export default async function LessonAttemptLayout({ children, params }: LayoutProps<"/lessons/[slug]/a">) {
  if (!(await getPublicLesson((await params).slug))) notFound();
  return children;
}
