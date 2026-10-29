import type { Metadata } from "next";
import Image from "next/image";
import { Band, ButtonLink, H2, Kicker, Rows, TextLink, Wrap } from "@/components/b/primitives";
import { bio, identity, mudzi, teaching } from "@/lib/founder-facts";

export const metadata: Metadata = {
  title: "About Shabari",
  description: bio,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <section aria-labelledby="about-h" className="bg-white pb-20 pt-10 sm:pb-28 sm:pt-16">
        <Wrap className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Image
            src="/images/shabari-portrait.jpg"
            alt="Shabari Shankar"
            width={700}
            height={875}
            priority
            sizes="(min-width: 1024px) 38vw, 90vw"
            className="h-auto w-full max-w-[32rem] rounded-2xl"
          />
          <div>
            <Kicker>About</Kicker>
            <h1 id="about-h" className="mt-4 text-[clamp(2.35rem,4.2vw,3.9rem)] leading-[1.04]">
              Hi, I’m Shabari.
            </h1>
            <p className="mt-3 text-[1.0625rem] text-quiet">{identity.degree}.</p>
            <p className="mt-8 max-w-[62ch] text-[1.1875rem] leading-relaxed text-specimen/90">{bio}</p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <ButtonLink href="/book">Book a free 15-min call</ButtonLink>
              <TextLink href="/research">Research & Teaching</TextLink>
            </div>
          </div>
        </Wrap>
      </section>
      <Band tone="mist" labelledBy="about-teach-h">
        <div className="grid gap-14 lg:grid-cols-2">
          <div>
            <H2 id="about-teach-h">Teaching</H2>
            <Rows items={teaching} className="mt-8" />
          </div>
          <div>
            <h2 className="text-[clamp(2rem,3.4vw,3rem)]">{mudzi.name}</h2>
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-specimen/85">{mudzi.body}</p>
            <p className="mt-4 text-[1.0625rem] text-specimen/85">
              {mudzi.figures.map((f) => `${f.value} ${f.label}`).join(", ")}. {mudzi.more}
            </p>
          </div>
        </div>
      </Band>
      <Wrap className="py-8">
        <p className="text-sm text-quiet">Independent tutoring and consulting. Not affiliated with or endorsed by MIT.</p>
      </Wrap>
    </>
  );
}
