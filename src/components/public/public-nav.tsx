"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { PublicMenu } from "./public-menu";

const LEFT = [
  { href: "/mcat-tutoring", label: "Tutoring" },
  { href: "/practice", label: "Practice" },
  { href: "/resources", label: "Notes" },
];
const RIGHT = [
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/book", label: "Book a call" },
];

/** Centred wordmark, thin links. Steps out of the way while reading, returns on scroll up. */
export function PublicNav({ account }: { account: React.ReactNode }) {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > 160 && y > prev);
  });

  return (
    <motion.header
      initial={false}
      animate={{ y: hidden && !reduce ? -96 : 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled ? "border-b border-hairline/80 bg-slide/92 backdrop-blur" : "bg-transparent"}`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-5 sm:px-8 md:grid md:grid-cols-[1fr_auto_1fr]">
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {LEFT.map((l) => (
            <Link key={l.href} href={l.href} className="text-[0.9rem] text-specimen/80 transition-colors hover:text-hema">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="whitespace-nowrap font-display text-[1.3rem] leading-none tracking-tight text-hema md:justify-self-center" aria-label="Study with Shabari, home">
          Study with Shabari
        </Link>
        <div className="flex items-center justify-end gap-7">
          <nav aria-label="More" className="hidden items-center gap-7 md:flex">
            {RIGHT.map((l) => (
              <Link key={l.href} href={l.href} className="text-[0.9rem] text-specimen/80 transition-colors hover:text-hema">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden text-[0.9rem] lg:block">{account}</div>
          <PublicMenu links={[...LEFT, ...RIGHT, { href: "/faq", label: "FAQ" }, { href: "/contact", label: "Contact" }, { href: "/dashboard", label: "Your dashboard" }]} />
        </div>
      </div>
    </motion.header>
  );
}
