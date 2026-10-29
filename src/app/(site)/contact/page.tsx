import type { Metadata } from "next";
import { Container, PageIntro } from "@/components/site/section";
import { contactEmail } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Ask a question about MCAT tutoring, admissions help, or the practice platform.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
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
            <ContactForm />
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
