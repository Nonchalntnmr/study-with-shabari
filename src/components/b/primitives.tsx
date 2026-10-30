import { Check } from "lucide-react";
import Link from "next/link";
import { paymentNote } from "@/lib/founder-facts";
import { cn } from "@/lib/utils";

// Concept B building blocks: white, navy and electric blue; one type family; flat surfaces.

export function Wrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-5 sm:px-8", className)}>{children}</div>;
}

type Tone = "white" | "mist" | "navy";
const TONE: Record<Tone, string> = {
  white: "bg-white",
  mist: "border-y border-hairline bg-mist",
  navy: "bg-hema text-white",
};

export function Band({ id, tone = "white", labelledBy, className, children }: { id?: string; tone?: Tone; labelledBy?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-20 py-24 sm:py-36", TONE[tone], className)}>
      <Wrap>{children}</Wrap>
    </section>
  );
}

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[0.95rem] font-semibold text-eosin", className)}>{children}</p>;
}

export function H2({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn("max-w-3xl text-[clamp(2.2rem,3.8vw,3.4rem)]", className)}>
      {children}
    </h2>
  );
}

export function Lead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("max-w-[62ch] text-[1.125rem] leading-relaxed text-quiet", className)}>{children}</p>;
}

type Variant = "primary" | "secondary" | "onDark";
const VARIANT: Record<Variant, string> = {
  primary: "bg-eosin text-white hover:bg-eosin-ink",
  secondary: "bg-white text-hema ring-1 ring-inset ring-hema/25 hover:ring-hema/60",
  onDark: "bg-white text-hema hover:bg-mist",
};

export function ButtonLink({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("inline-flex h-12 items-center justify-center rounded-full px-6 text-[1rem] font-semibold transition-colors", VARIANT[variant], className)}>
      {children}
    </Link>
  );
}

/** The secondary action on a screen: a text link, so each screen keeps one primary button. */
export function TextLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center text-[1rem] font-semibold text-hema underline decoration-hema/25 decoration-2 underline-offset-[6px] transition-colors hover:decoration-eosin", className)}
    >
      {children}
    </Link>
  );
}

/** An editorial list: generous rows separated by hairlines, no icons. */
export function Rows({ items, className, size = "md" }: { items: readonly string[]; className?: string; size?: "md" | "lg" }) {
  return (
    <ul className={cn("border-t border-hairline", className)}>
      {items.map((t) => (
        <li key={t} className={cn("border-b border-hairline text-specimen/90", size === "lg" ? "py-5 text-[1.1875rem] leading-relaxed" : "py-4 text-[1.0625rem] leading-relaxed")}>
          {t}
        </li>
      ))}
    </ul>
  );
}

export function Checks({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3.5", className)}>
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[1.0625rem] leading-relaxed text-specimen/90">
          <Check aria-hidden className="mt-[0.3rem] size-[1.05rem] shrink-0 text-eosin" strokeWidth={2.5} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl border border-hairline bg-white p-7 sm:p-8", className)}>{children}</div>;
}

export function PaymentNote({ className }: { className?: string }) {
  return <p className={cn("text-[0.98rem] text-quiet", className)}>{paymentNote}</p>;
}
