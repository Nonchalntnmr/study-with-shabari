"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendlyEmbed } from "@/components/site/calendly-embed";
import { useSearchParam } from "@/lib/use-client-value";
import { cn } from "@/lib/utils";

type Service = "mcat" | "admissions";
const LABEL: Record<Service, string> = { mcat: "MCAT", admissions: "College Admissions" };

/**
 * The spec's booking toggle: one Calendly slot per service. `?service=` picks
 * the starting tab, so each service page can link straight to its own slot.
 * A missing link shows an honest fallback instead of an empty frame.
 */
export function BookingToggle({ urls, contactEmail }: { urls: Record<Service, string | null>; contactEmail: string }) {
  const requested = useSearchParam("service");
  const [service, setService] = useState<Service>("mcat");
  useEffect(() => {
    // The query string is only readable after hydration on this static page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (requested === "admissions" || requested === "mcat") setService(requested);
  }, [requested]);
  const url = urls[service];
  // While both services share one Calendly profile, say which event is the free call.
  const shared = urls.mcat !== null && urls.mcat === urls.admissions;

  return (
    <div>
      <div role="tablist" aria-label="What is the call about?" className="inline-flex rounded-full bg-mist p-1 ring-1 ring-inset ring-hairline">
        {(Object.keys(LABEL) as Service[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={service === s}
            onClick={() => setService(s)}
            className={cn("h-11 rounded-full px-5 text-[0.98rem] font-semibold transition-colors", service === s ? "bg-hema text-white" : "text-hema hover:bg-white")}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>
      <div className="mt-8" role="tabpanel" aria-label={`${LABEL[service]} booking`}>
        {url ? (
          <>
            {shared && (
              <p className="mb-4 text-[1rem] text-quiet">
                For the free 15-minute {LABEL[service] === "MCAT" ? "MCAT" : "college admissions"} call, choose “initial consult”. Your booking is marked
                as {LABEL[service] === "MCAT" ? "an MCAT" : "a College Admissions"} call.
              </p>
            )}
            <CalendlyEmbed key={service} url={url} campaign={service} />
          </>
        ) : (
          <div className="rounded-2xl border border-hairline bg-white p-8 text-center sm:p-12">
            <h2 className="text-[1.5rem]">Online scheduling for {LABEL[service].toLowerCase()} calls is coming soon.</h2>
            <p className="mx-auto mt-3 max-w-md text-quiet">Send a few times that work for you and Shabari will confirm one by email.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href={`/contact?topic=${service === "mcat" ? "consultation" : "admissions"}`}
                className="inline-flex h-12 items-center rounded-full bg-eosin px-6 font-semibold text-white hover:bg-eosin-ink"
              >
                Request a time
              </Link>
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(`${LABEL[service]} consult`)}`}
                className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-hema ring-1 ring-inset ring-hema/20 hover:ring-hema/50"
              >
                Email {contactEmail}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
