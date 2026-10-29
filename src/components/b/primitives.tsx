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
    <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-20 py-20 sm:py-28", TONE[tone], className)}>
      <Wrap>{children}</Wrap>
    </section>
  );
}

export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[0.95rem] font-semibold text-eosin", className)}>{children}</p>;
}

export function H2({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn("max-w-3xl text-[clamp(2rem,3.4vw,3rem)]", className)}>
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
  secondary: "bg-white text-hema ring-1 ring-inset ring-hema/20 hover:ring-hema/50",
  onDark: "bg-white text-hema hover:bg-mist",
};

export function ButtonLink({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("inline-flex h-12 items-center justify-center rounded-full px-6 text-[1rem] font-semibold transition-colors", VARIANT[variant], className)}>
      {children}
    </Link>
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
  return <p className={cn("text-[0.98rem] text-quiet", className)}>{paymentNote} No credit card checkout.</p>;
}
