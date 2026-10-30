import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingToggle } from "@/components/b/booking-toggle";
import { Kicker, PaymentNote, Wrap } from "@/components/b/primitives";
import { safeCalendlyUrl } from "@/lib/calendly";
import { consultPlatform, contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Book a free 15-minute call",
  description: `Pick a time for a free 15-minute${consultPlatform ? ` ${consultPlatform}` : ""} call about MCAT prep or college admissions.`,
  alternates: { canonical: "/book" },
};

// Two slots per the founder spec. NEXT_PUBLIC_CALENDLY_URL is the earlier single link and still serves MCAT.
const urls = {
  mcat: safeCalendlyUrl(process.env.NEXT_PUBLIC_CALENDLY_URL_MCAT || process.env.NEXT_PUBLIC_CALENDLY_URL),
  admissions: safeCalendlyUrl(process.env.NEXT_PUBLIC_CALENDLY_URL_ADMISSIONS),
};

export default function BookPage() {
  return (
    <>
      <section aria-labelledby="book-h" className="border-b border-hairline bg-mist pb-14 pt-10 sm:pb-16 sm:pt-16">
        <Wrap>
          <Kicker>Free consultation</Kicker>
          <h1 id="book-h" className="mt-4 text-[clamp(2.35rem,4.2vw,3.9rem)] leading-[1.04]">
            Book a free <span className="whitespace-nowrap">15-minute</span> call.
          </h1>
          <p className="mt-5 max-w-2xl text-[1.125rem] text-quiet">
            {consultPlatform ? `On ${consultPlatform}. ` : ""}Choose MCAT or College Admissions, then pick a time. Parents are welcome to join.
          </p>
          <PaymentNote className="mt-2" />
        </Wrap>
      </section>
      <section className="py-14">
        <Wrap className="max-w-5xl">
          <Suspense fallback={null}>
            <BookingToggle urls={urls} contactEmail={contactEmail} />
          </Suspense>
        </Wrap>
      </section>
    </>
  );
}
