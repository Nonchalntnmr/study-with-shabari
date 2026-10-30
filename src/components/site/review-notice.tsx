import Link from "next/link";

/**
 * Founder decision, 2026-10-30: practice sets published before Shabari has reviewed them say so,
 * with a way to report an error. Never describe these questions as written or verified by her.
 */
export const REVIEW_LABEL = "Practice set, being reviewed by Shabari.";

export function ReviewNotice({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-[0.95rem] text-specimen ${className}`}>
      {REVIEW_LABEL}{" "}
      <Link href="/contact?topic=support" className="font-medium text-hema underline underline-offset-4">
        Report an error
      </Link>
    </p>
  );
}
