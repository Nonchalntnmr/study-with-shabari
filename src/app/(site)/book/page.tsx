import type { Metadata } from "next";
import Link from "next/link";
import { CalendlyEmbed } from "@/components/site/calendly-embed";
import { Container, PageIntro } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { safeCalendlyUrl } from "@/lib/calendly";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a free 15-minute consultation",
  description: "Pick a time for a free 15-minute Zoom call about your MCAT plan.",
  alternates: { canonical: "/book" },
};

const calendlyUrl = safeCalendlyUrl(process.env.NEXT_PUBLIC_CALENDLY_URL);

export default function BookPage() {
  return (
    <>
      <PageIntro eyebrow="Free consultation" title="Book a free 15-minute call.">
        We’ll talk through your timeline, scores and weak spots. You leave with a next step, whether or not we work together.
      </PageIntro>
      <section className="py-14">
        <Container className="max-w-4xl">
          {calendlyUrl ? (
            <CalendlyEmbed url={calendlyUrl} />
          ) : (
            <div className="rounded-2xl border bg-white p-8 text-center">
              <h2 className="text-xl font-semibold">Online scheduling is coming soon.</h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                In the meantime, send a few times that work for you and I’ll confirm one by email.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild className="h-11 px-5">
                  <Link href="/contact?topic=consultation">Request a time</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 px-5">
                  <a href={`mailto:${contactEmail}?subject=${encodeURIComponent("MCAT tutoring consult")}`}>Email {contactEmail}</a>
                </Button>
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
