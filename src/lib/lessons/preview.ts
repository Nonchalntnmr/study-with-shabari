// Unapproved lessons are visible only where they can't be mistaken for the real
// site: local development, Vercel preview deployments, and to signed-in admins.
// A production build (including `next start` for E2E) hides them.

export function previewAllowed(isAdmin: boolean, env: Record<string, string | undefined> = process.env): boolean {
  if (isAdmin) return true;
  if (env.VERCEL_ENV === "production") return false;
  return env.VERCEL_ENV === "preview" || env.NODE_ENV === "development";
}

export const DRAFT_BADGE = "Draft — pending Shabari’s review";
/** Shown on approved lessons whose questions or explanations were drafted with AI. Never attribute them to Shabari. */
export const AI_NOTE = "Questions and explanations drafted with AI, then reviewed before publishing.";
export const PREVIEW_NOTE = "Questions and explanations were drafted with AI and haven’t been reviewed yet.";
