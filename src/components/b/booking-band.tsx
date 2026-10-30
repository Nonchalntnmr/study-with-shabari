import { consultPlatform } from "@/lib/site";
import { ButtonLink, Wrap } from "./primitives";

/** Closing call to action for one service; the booking page opens with that service selected. */
export function BookingBand({ service }: { service: "mcat" | "admissions" }) {
  const label = service === "mcat" ? "MCAT prep" : "college admissions";
  return (
    <section aria-labelledby={`book-${service}-h`} className="bg-hema py-20 text-white sm:py-24">
      <Wrap className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id={`book-${service}-h`} className="max-w-2xl text-[clamp(2rem,3.4vw,3rem)] text-white">
            Book a free consult call.
          </h2>
          <p className="mt-4 text-[1.125rem] text-white/80">
            Talk through your plan for {label}
            {consultPlatform ? `, on ${consultPlatform}` : ""}.
          </p>
        </div>
        <ButtonLink href={`/book?service=${service}`} variant="onDark">
          Book a free consult call
        </ButtonLink>
      </Wrap>
    </section>
  );
}
