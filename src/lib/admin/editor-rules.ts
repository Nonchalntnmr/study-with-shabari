// Pure checks for the admin editors, kept free of the database so they can be unit tested.

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,80}$/;

export function slugProblem(slug: string): string | null {
  return SLUG_RE.test(slug) ? null : "Use 2–81 lowercase letters, digits and dashes (e.g. cp-set-2).";
}

/** External links must be https so the site never sends students to an insecure page. */
export function httpsUrlProblem(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname.includes(".") ? null : "Links must start with https://";
  } catch {
    return "That isn’t a valid URL.";
  }
}

/** Buttons may point at a page on this site ("/book") or an https URL. */
export function ctaHrefProblem(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) return null;
  return httpsUrlProblem(href) ? "Use a site path like /book or an https:// link." : null;
}

/** One feature per line; blank lines dropped. */
export function parseFeatures(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export type OrderedItem = { questionId: string; passageId: string | null };

/** Questions that share a passage must sit next to each other, as on the real exam. */
export function contiguityProblem(items: OrderedItem[]): string | null {
  const seen = new Set<string>();
  let previous: string | null = null;
  for (const item of items) {
    const p = item.passageId;
    if (p && p !== previous) {
      if (seen.has(p)) return "Questions from the same passage must stay together.";
      seen.add(p);
    }
    previous = p;
  }
  return null;
}

/** Where a newly added question goes: right after its passage group, or at the end. */
export function insertPosition(items: OrderedItem[], passageId: string | null): number {
  if (!passageId) return items.length;
  let last = -1;
  items.forEach((item, i) => {
    if (item.passageId === passageId) last = i;
  });
  return last === -1 ? items.length : last + 1;
}

export function moveItem<T>(items: T[], index: number, direction: "up" | "down"): T[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
