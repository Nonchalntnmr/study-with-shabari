// Unapproved lessons are visible only to signed-in admins, in local development,
// and on a deployment that opts in with LESSON_PREVIEW=on. Vercel preview builds
// don't get it automatically: they may share the production database and be
// public, so drafts would be readable at a branch URL. Production never shows them.

export function previewAllowed(isAdmin: boolean, env: Record<string, string | undefined> = process.env): boolean {
  if (isAdmin) return true;
  if (env.VERCEL_ENV === "production") return false;
  return env.LESSON_PREVIEW === "on" || env.NODE_ENV === "development";
}

export const DRAFT_BADGE = "Draft — pending Shabari’s review";
/** Shown on approved lessons whose questions or explanations were drafted with AI. Never attribute them to Shabari. */
export const AI_NOTE = "Questions and explanations drafted with AI, then reviewed before publishing.";
export const PREVIEW_NOTE = "Questions and explanations were drafted with AI and haven’t been reviewed yet.";
