"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const CALENDLY_ORIGIN = "https://calendly.com";

/**
 * Inline Calendly scheduler. The booking is only reported as confirmed when
 * Calendly itself posts `calendly.event_scheduled` from its own origin; we
 * never infer success from anything the page does.
 */
export function CalendlyEmbed({ url }: { url: string }) {
  const [scheduled, setScheduled] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    // Calendly only posts events to the parent when told which domain embeds it.
    const u = new URL(url);
    u.searchParams.set("embed_domain", window.location.host);
    u.searchParams.set("embed_type", "Inline");
    setSrc(u.toString());

    function onMessage(e: MessageEvent) {
      if (e.origin !== CALENDLY_ORIGIN) return;
      const data = e.data as { event?: string } | null;
      if (data?.event === "calendly.event_scheduled") setScheduled(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [url]);

  return (
    <div className="space-y-4">
      {scheduled && (
        <div role="status" className="flex gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <p>
            <span className="font-semibold">Calendly confirmed your booking.</span> Check your email for the confirmation and meeting link
            from Calendly.
          </p>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border bg-white">
        {src ? (
          <iframe src={src} title="Schedule a free consultation with Calendly" className="h-[760px] w-full" referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <div className="h-[760px] animate-pulse bg-muted/50" />
        )}
      </div>
    </div>
  );
}
