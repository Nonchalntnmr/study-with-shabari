import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-blue", className)}>{children}</p>;
}

/** Standard interior page header. */
export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b bg-gradient-to-b from-sky to-background">
      <Container className="py-14 sm:py-20">
        {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-lg text-muted-foreground">{children}</div>}
      </Container>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-10 max-w-2xl">
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-muted-foreground">{children}</p>}
    </div>
  );
}
