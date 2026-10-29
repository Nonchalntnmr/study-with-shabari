"use client";

import { useSyncExternalStore } from "react";

const onHistory = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

/**
 * A query-string value read in the browser. Renders as null on the server, then
 * updates in place after hydration, so the component is never remounted (typed
 * input survives) and the page can stay static.
 */
export function useSearchParam(name: string): string | null {
  return useSyncExternalStore(onHistory, () => new URLSearchParams(window.location.search).get(name), () => null);
}

/** The page's host in the browser; null during server rendering. */
export function useHost(): string | null {
  return useSyncExternalStore(onHistory, () => window.location.host, () => null);
}
