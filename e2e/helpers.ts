import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export const E2E_DB_URL = process.env.E2E_DATABASE_URL ?? "postgresql://shabari@127.0.0.1:54329/sws_e2e";
export const ADMIN = { email: "admin@e2e.test", password: "e2e-admin-password-123" };

type Choice = { label: string; correct?: boolean };
type Q = { id: string; choices: Choice[] };

/** Correct labels in exam order, straight from the shipped sample bank. */
export function answerKey(slug: string): string[] {
  const bank = JSON.parse(readFileSync("content/samples/sample-bank.json", "utf8"));
  const exam = bank.exams.find((e: { slug: string }) => e.slug === slug);
  const qs: Q[] = exam.items.flatMap((i: { type: string; questions?: Q[] } & Q) => (i.type === "passage" ? i.questions : [i]));
  return qs.map((q) => q.choices.find((c) => c.correct)!.label);
}

export async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: E2E_DB_URL });
  await c.connect();
  try {
    return (await c.query(query, params)).rows as T[];
  } finally {
    await c.end();
  }
}

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@e2e.test`;

export async function signIn(page: Page, email: string, password: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Form errors, not Next's route announcer (which also has role="alert"). */
export const formAlert = (page: Page) => page.locator("form [role=alert], [role=alert]:not(#__next-route-announcer__)").first();

export async function signUp(page: Page, email: string, password = "student-password-1") {
  await page.goto("/signup");
  await page.getByLabel("Name (optional)").fill("Test Student");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create free account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Pick a choice by its letter, the way a student clicks the visible option. */
export async function choose(page: Page, label: string) {
  await page.locator("label", { has: page.getByRole("radio", { name: new RegExp(`^${label}\\. `) }) }).click();
}

export async function waitSaved(page: Page) {
  await expect(page.getByTestId("save-status")).toHaveText(/Saved/, { timeout: 10_000 });
}

export async function startSet(page: Page, slug: string, mode: "Timed" | "Untimed" = "Timed") {
  await page.goto(`/practice/${slug}`);
  await page.getByLabel(new RegExp(`^${mode}`)).check();
  await page.getByRole("button", { name: "Start practice set" }).click();
  await expect(page).toHaveURL(/\/exam\/[a-z0-9]+$/);
  await expect(page.getByText(/Question 1 of \d+/)).toBeVisible();
}

/** Answer every question in order; `pick(i)` returns the letter for question i. */
export async function answerAll(page: Page, count: number, pick: (i: number) => string) {
  for (let i = 0; i < count; i++) {
    await expect(page.getByText(`Question ${i + 1} of ${count}`)).toBeVisible();
    // Passage questions show tabs on small screens; the question pane is always present on desktop.
    await choose(page, pick(i));
    await page.getByRole("button", { name: i === count - 1 ? "Review answers" : "Next" }).click();
  }
}

export async function submitFromReview(page: Page) {
  await page.getByRole("button", { name: "Submit and see results" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Submit" }).click();
  await expect(page).toHaveURL(/\/results$/);
}
