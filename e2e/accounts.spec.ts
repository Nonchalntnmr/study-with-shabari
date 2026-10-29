import { expect, test } from "@playwright/test";
import { formAlert, answerAll, answerKey, sql, startSet, submitFromReview, signUp, uniqueEmail, waitSaved, choose } from "./helpers";

test("smoke: sign up, take a timed set, submit, see dashboard analytics", async ({ page }) => {
  const email = uniqueEmail("student");
  await signUp(page, email);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hi, Test.");

  const key = answerKey("bb-sample-set-1");
  await startSet(page, "bb-sample-set-1", "Timed");
  await answerAll(page, 8, (i) => (i < 6 ? key[i] : ["A", "B", "C", "D"].find((l) => l !== key[i])!));
  await submitFromReview(page);
  await expect(page.getByTestId("score")).toHaveText("6/8");

  await page.getByRole("link", { name: "See your progress" }).click();
  await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();
  await expect(page.getByText("75%").first()).toBeVisible();
  await expect(page.getByText("6 of 8 correct")).toBeVisible();
  await expect(page.getByRole("main").getByText("Biological and Biochemical Foundations")).toBeVisible();

  await page.goto("/dashboard/history");
  await expect(page.getByRole("cell", { name: "Bio/Biochem sample set 1" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "6/8 · 75%" })).toBeVisible();

  await page.goto("/dashboard/plan");
  await expect(page.getByText(/Take “(Chem\/Phys|Psych\/Soc) sample set 1”/).first()).toBeVisible();
});

test("guest practice is claimed by the account created afterwards", async ({ page }) => {
  await startSet(page, "cp-sample-set-1", "Untimed");
  await choose(page, "B");
  await waitSaved(page);
  const attemptId = page.url().split("/").at(-1)!;

  const email = uniqueEmail("claimer");
  await signUp(page, email);
  const [row] = await sql<{ email: string }>(`SELECT u.email FROM "Attempt" a JOIN "User" u ON u.id = a."userId" WHERE a.id = $1`, [attemptId]);
  expect(row.email).toBe(email);
  await page.goto("/dashboard");
  await expect(page.getByRole("main").getByText("Chem/Phys sample set 1", { exact: true })).toBeVisible();
});

test("students can download and delete their data", async ({ page }) => {
  const email = uniqueEmail("leaver");
  await signUp(page, email);
  const res = await page.request.get("/api/account/export");
  expect(res.status()).toBe(200);
  expect((await res.json()).email).toBe(email);

  await page.goto("/dashboard/account");
  await page.getByLabel("Confirm with your password").fill("wrong-password");
  await page.getByRole("button", { name: "Delete my account and data" }).click();
  await expect(formAlert(page)).toHaveText("That password isn’t right.");
  await page.getByLabel("Confirm with your password").fill("student-password-1");
  await page.getByRole("button", { name: "Delete my account and data" }).click();
  await expect(page).toHaveURL(/\/\?account=deleted/);
  expect(await sql(`SELECT 1 FROM "User" WHERE email = $1`, [email])).toHaveLength(0);
  expect((await page.request.get("/api/account/export")).status()).toBe(401);
});

test("sign-in rejects a wrong password without revealing whether the account exists", async ({ page }) => {
  for (const email of ["admin@e2e.test", uniqueEmail("nobody")]) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("definitely-wrong-pw");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(formAlert(page)).toHaveText("That email and password don’t match.");
  }
});
