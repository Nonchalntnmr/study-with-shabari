import { notFound } from "next/navigation";

// The /experience prototypes are never public on the production deployment. They answer a real
// 404 there unless that deployment opts in with EXPERIENCE_PREVIEW=on. Same rule as the lesson
// preview (src/lib/lessons/preview.ts): decided from the environment only, never the visitor.
//
// Every /experience page is prerendered, so this runs at build time (Vercel sets VERCEL_ENV during
// the build) and the 404 is baked into the static output. Nothing streams before the decision:
// the layout and every page call gateExperience() synchronously, before rendering anything.

export function experienceAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL_ENV !== "production") return true;
  return env.EXPERIENCE_PREVIEW === "on";
}

/** Call first thing in every /experience layout and page. */
export function gateExperience(env: Record<string, string | undefined> = process.env): void {
  if (!experienceAllowed(env)) notFound();
}

/** Shown on every prototype page, so nobody mistakes it for the live site. */
export const PROTOTYPE_NOTE = "Prototype. Not part of the live site.";
