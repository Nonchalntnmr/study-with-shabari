import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageIntro } from "@/components/site/section";
import { contactEmail } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Ask a question about MCAT tutoring, admissions help, or the practice platform.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage({ searchParams }: PageProps<"/contact">) {
  return (
    <>
      <PageIntro eyebrow="Contact" title="Get in touch.">
        Tell me where you are with the MCAT or your applications. You can also email{" "}
        <a className="font-medium text-blue hover:underline" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
        .
      </PageIntro>
      <section className="py-14">
        <Container className="max-w-2xl">
          <div className="rounded-2xl border bg-white p-6 sm:p-8">
            {/* The preselected topic comes from the URL, so only the form waits for it. */}
            <Suspense fallback={<ContactForm />}>
              {searchParams.then(({ topic }) => (
                <ContactForm defaultKind={typeof topic === "string" ? topic.toUpperCase() : undefined} />
              ))}
            </Suspense>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Your message is stored so I can reply to it. See the{" "}
            <a href="/privacy" className="underline underline-offset-2">
              privacy policy
            </a>
            .
          </p>
        </Container>
      </section>
    </>
  );
}
