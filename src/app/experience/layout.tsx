import type { Metadata } from "next";
import Link from "next/link";
import { ExperienceHeader } from "@/components/experience/chrome";
import { PROTOTYPE_NOTE, experienceAllowed, gateExperience } from "@/lib/experience/gate";
import "@/components/experience/experience.css";

// "The Beauty of Intelligence" prototypes. Prerendered; on the production deployment the gate
// bakes a 404 into the build (src/lib/experience/gate.ts). `instant = false`: this segment is
// allowed to block, so the decision is always made before anything streams.
export const instant = false;

// Only where the prototypes exist: on the production deployment the 404 must not carry their title.
export function generateMetadata(): Metadata {
  if (!experienceAllowed()) return { robots: { index: false, follow: false } };
  return { title: { default: "Prototypes", template: "%s · Prototype · Study with Shabari" }, robots: { index: false, follow: false } };
}

export default function ExperienceLayout({ children }: LayoutProps<"/experience">) {
  gateExperience();
  return (
    <div className="public experience flex min-h-full flex-1 flex-col">
      <ExperienceHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-[color:var(--exp-rule)] py-10 text-[0.95rem] text-[color:var(--exp-quiet)]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
          <p>{PROTOTYPE_NOTE}</p>
          <nav aria-label="Prototypes" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link className="underline underline-offset-4 hover:text-hema" href="/experience">
              All prototypes
            </Link>
            <Link className="underline underline-offset-4 hover:text-hema" href="/">
              The live site
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
