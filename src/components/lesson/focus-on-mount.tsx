"use client";

import { useEffect } from "react";

/**
 * Moves keyboard and screen-reader focus to a heading when a lesson step or
 * reveal appears, so the new content is announced and reading starts there.
 */
export function FocusOnMount({ id, scroll = false }: { id: string; scroll?: boolean }) {
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.focus({ preventScroll: true });
    if (scroll) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }
  }, [id, scroll]);
  return null;
}
