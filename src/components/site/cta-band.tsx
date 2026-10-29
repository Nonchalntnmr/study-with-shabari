import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "./section";

export function CtaBand({ title = "Not sure where to start?", children }: { title?: string; children?: React.ReactNode }) {
  return (
    <section className="py-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-navy px-8 py-14 text-white sm:px-14">
          <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-blue/40 blur-3xl" />
          <h2 className="relative max-w-xl text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">{title}</h2>
          <p className="relative mt-4 max-w-xl text-lg text-white/80">
            {children ?? "Book a free 15-minute call. We’ll look at your timeline and scores, and you’ll leave with a next step whether or not we work together."}
          </p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-11 bg-white px-5 text-navy hover:bg-sky">
              <Link href="/book">Book a free call</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-11 px-5 text-white hover:bg-white/10 hover:text-white">
              <Link href="/practice">Try a free practice set</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
