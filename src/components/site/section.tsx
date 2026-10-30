import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-5 sm:px-8", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[0.95rem] font-semibold text-eosin", className)}>{children}</p>;
}

/** Standard interior page header. */
export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b border-hairline bg-mist">
      <Container className="py-14 sm:py-20">
        {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
        <h1 className="max-w-3xl text-[clamp(2.4rem,4.6vw,3.75rem)]">{title}</h1>
        {children && <div className="mt-5 max-w-2xl text-lg text-quiet">{children}</div>}
      </Container>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-10 max-w-2xl">
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h2 className="text-[clamp(1.9rem,3.2vw,2.6rem)]">{title}</h2>
      {children && <p className="mt-4 text-lg text-quiet">{children}</p>}
    </div>
  );
}
