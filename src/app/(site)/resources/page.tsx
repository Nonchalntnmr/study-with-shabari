import type { Metadata } from "next";
import Link from "next/link";
import { ResourceList } from "@/components/site/resource-list";
import { Container, PageIntro, SectionHeading } from "@/components/site/section";
import { getAvailability } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Free MCAT notes and practice",
  description: "Free MCAT content-review notes for Chem/Phys, Bio/Biochem and Psych/Soc, plus original practice sets.",
  alternates: { canonical: "/resources" },
};

export default async function ResourcesPage() {
  const { practice } = await getAvailability();
  return (
    <>
      <PageIntro eyebrow="Free MCAT notes" title="My complete MCAT notes. Free, no signup.">
        These are the content-review docs I made while studying: everything condensed into one place per section. No email required.
      </PageIntro>
      <section className="py-16">
        <Container>
          <SectionHeading title="Content review notes" />
          <ResourceList kind="NOTES" />
        </Container>
      </section>
      <section className="border-t bg-white py-16">
        <Container>
          <SectionHeading title="Practice sets">
            Original passage-style questions with full explanations.{" "}
            {practice ? (
              <Link href="/practice" className="font-medium text-blue hover:underline">
                See all practice
              </Link>
            ) : (
              "Coming soon."
            )}
          </SectionHeading>
          <ResourceList kind="PRACTICE_SET" />
        </Container>
      </section>
    </>
  );
}
