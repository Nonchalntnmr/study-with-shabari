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

const onHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

/** A value from the URL fragment (`#name=value`). Fragments never reach the server, so they stay out of request logs. */
export function useHashParam(name: string): string | null {
  return useSyncExternalStore(onHash, () => new URLSearchParams(window.location.hash.slice(1)).get(name), () => null);
}

/** The page's host in the browser; null during server rendering. */
export function useHost(): string | null {
  return useSyncExternalStore(onHistory, () => window.location.host, () => null);
}
