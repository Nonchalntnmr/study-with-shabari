"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Phones only: once the hero's buttons have scrolled away, a small "Book a free consult call" pill
// stays at the bottom left, except while another booking button is already on screen (no doubled
// CTAs). It keeps the right 104 px clear, where the chat bubble sits, so the bubble never covers it.
// Rendered last in the page, so the hero's button stays the first match.

export function MobileBookBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero-ctas");
    if (!hero) return;
    const state = { pastHero: false, others: new Set<Element>() };
    const update = () => setShow(state.pastHero && state.others.size === 0);
    const heroIo = new IntersectionObserver(([e]) => {
      state.pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
      update();
    });
    heroIo.observe(hero);
    const othersIo = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) state.others.add(e.target);
        else state.others.delete(e.target);
      }
      update();
    });
    document.querySelectorAll('main a[href^="/book"]').forEach((a) => {
      if (!a.closest("#hero-ctas") && !a.hasAttribute("data-sticky-book")) othersIo.observe(a);
    });
    return () => {
      heroIo.disconnect();
      othersIo.disconnect();
    };
  }, []);
  return (
    <div
      className={`fixed bottom-4 left-4 z-40 transition-[opacity,transform] duration-300 motion-reduce:transition-none md:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
      style={{ maxWidth: "calc(100vw - 120px)" }}
      aria-hidden={!show}
    >
      <Link
        href="/book?service=mcat"
        tabIndex={show ? 0 : -1}
        data-sticky-book
        className="inline-flex h-12 items-center rounded-full bg-eosin px-5 text-[0.98rem] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(11,31,68,0.55)] hover:bg-eosin-ink"
      >
        Book a free consult call
      </Link>
    </div>
  );
}
