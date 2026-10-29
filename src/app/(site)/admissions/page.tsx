import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { Container, PageIntro } from "@/components/site/section";

export const metadata: Metadata = {
  title: "Admissions guidance",
  description: "Application help from Shabari Shankar, offered as part of a custom plan. Scoped and priced after a free consultation.",
  alternates: { canonical: "/admissions" },
};

export default function AdmissionsPage() {
  return (
    <>
      <PageIntro eyebrow="Admissions" title="Help with the application, too.">
        Alongside MCAT prep, I help with applications as part of a custom plan. Every applicant needs something different, so we scope it
        together on a free call.
      </PageIntro>
      <section className="py-20">
        <Container className="grid gap-10 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-7">
            <h2 className="text-lg font-semibold">How it starts</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Book a free 15-minute call and tell me where you are in the process: what you’re applying to, your timeline, and what you
              want help with.
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-7">
            <h2 className="text-lg font-semibold">What it costs</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Application help is part of the{" "}
              <Link href="/pricing" className="font-medium text-blue hover:underline">
                custom plan
              </Link>
              . Pricing comes after the consultation, once we both know the scope.
            </p>
          </div>
          <div className="rounded-2xl border bg-white p-7">
            <h2 className="text-lg font-semibold">What I won’t promise</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              No one can guarantee an admissions decision, and I won’t. What I can offer is honest feedback and a clear plan.
            </p>
          </div>
        </Container>
      </section>
      <CtaBand title="Tell me where you are in the process." />
    </>
  );
}
