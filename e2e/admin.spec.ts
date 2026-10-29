import { expect, test } from "@playwright/test";
import { ADMIN, signIn, signUp, sql, uniqueEmail } from "./helpers";

test.afterEach(async () => {
  await sql(`UPDATE "Question" SET status = 'PUBLISHED' WHERE "externalId" = 'ps-q-classical-conditioning'`);
  await sql(`UPDATE "Exam" SET status = 'PUBLISHED' WHERE slug = 'ps-sample-set-1'`);
});

test("10. admin sign-in reaches the admin area", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  for (const [link, heading] of [["Inquiries", "Inquiries"], ["Content", "Content"], ["Users", "Users"], ["Audit log", "Audit log"], ["Question quality", "Question quality"]]) {
    await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("11. non-admins can't reach admin pages or data", async ({ page, request }) => {
  // Signed out: a real redirect before anything renders.
  const anon = await request.get("/admin/users", { maxRedirects: 0 });
  expect(anon.status()).toBe(307);
  expect(anon.headers()["location"]).toBe("/login?next=%2Fadmin%2Fusers");
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fusers/);

  // Signed-in student: the admin area doesn't exist for them.
  await signUp(page, uniqueEmail("snoop"));
  for (const path of ["/admin", "/admin/users", "/admin/inquiries", "/admin/audit"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "This page doesn’t exist." }), path).toBeVisible();
    expect(await page.content()).not.toContain(ADMIN.email);
  }
});

test("12. publishing workflow: guarded unpublish, public cache refresh, republish", async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password);
  const [q] = await sql<{ id: string }>(`SELECT id FROM "Question" WHERE "externalId" = 'ps-q-classical-conditioning'`);

  // A question inside a published exam can't be unpublished.
  await page.goto("/admin/content?tab=questions");
  const row = page.locator("li", { hasText: "A dog is repeatedly given food" });
  await row.getByLabel("Status").selectOption("DRAFT");
  await row.getByRole("button", { name: "Set" }).click();
  await expect(row.getByRole("status")).toContainText("first; it still uses this question");

  // Unpublish the exam: it disappears from the public practice page.
  await page.goto("/admin/content?tab=exams");
  const exam = page.locator("li", { hasText: "Psych/Soc sample set 1" });
  await exam.getByLabel("Status").selectOption("DRAFT");
  await exam.getByRole("button", { name: "Set" }).click();
  await expect(exam.getByRole("status")).toContainText("Exam set to draft");
  await page.goto("/practice");
  await expect(page.getByRole("link", { name: /Psych\/Soc sample set 1/ })).toHaveCount(0);
  await page.goto("/practice/ps-sample-set-1");
  await expect(page.getByRole("heading", { name: "This page doesn’t exist." })).toBeVisible();

  // Now the question can move to draft, and publishing the exam is blocked until it's republished.
  await page.goto("/admin/content?tab=questions");
  await row.getByLabel("Status").selectOption("DRAFT");
  await row.getByRole("button", { name: "Set" }).click();
  await expect(row.getByRole("status")).toContainText("Question set to draft");
  await page.goto("/admin/content?tab=exams");
  await exam.getByLabel("Status").selectOption("PUBLISHED");
  await exam.getByRole("button", { name: "Set" }).click();
  await expect(exam.getByRole("status")).toContainText("1 question is not published yet");

  await page.goto("/admin/content?tab=questions");
  await row.getByLabel("Status").selectOption("PUBLISHED");
  await row.getByRole("button", { name: "Set" }).click();
  await expect(row.getByRole("status")).toContainText("Question set to published");
  await page.goto("/admin/content?tab=exams");
  await exam.getByLabel("Status").selectOption("PUBLISHED");
  await exam.getByRole("button", { name: "Set" }).click();
  await expect(exam.getByRole("status")).toContainText("Exam set to published");
  await page.goto("/practice");
  await expect(page.getByRole("link", { name: /Psych\/Soc sample set 1/ })).toBeVisible();

  // Every step is in the audit log.
  const actions = await sql<{ action: string }>(`SELECT action FROM "AuditLog" WHERE "entityId" = $1 ORDER BY "createdAt"`, [q.id]);
  expect(actions.map((a) => a.action)).toEqual(["question.status", "question.status"]);
});
