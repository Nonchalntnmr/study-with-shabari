import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ADMIN, formAlert, signIn, signUp, sql, uniqueEmail } from "./helpers";

// Admin and account workflows added in M2: AI-drafted questions need a human
// review before they publish, publishing records a version with reviewer
// attribution, and password reset works end to end with the token kept out of
// the URL once read.

const rid = () => `e2e${randomBytes(8).toString("hex")}`;

test("an AI-drafted question can't publish until an admin approves it; the version records the reviewer", async ({ page }) => {
  const qid = rid();
  const [topic] = await sql<{ id: string }>(`SELECT id FROM "Topic" WHERE section = 'CP' LIMIT 1`);
  await sql(`INSERT INTO "Question" (id, section, stem, explanation, status, "authoredBy", "updatedAt") VALUES ($1, 'CP', 'Which change raises the pH of a buffer most?', 'Adding conjugate base raises the ratio [A-]/[HA], so pH rises.', 'DRAFT', 'AI', now())`, [qid]);
  for (const [label, text, correct] of [["A", "Adding conjugate base", true], ["B", "Adding weak acid", false], ["C", "Adding water", false], ["D", "Cooling the solution slightly", false]] as const) {
    await sql(`INSERT INTO "Choice" (id, "questionId", label, text, "isCorrect", rationale) VALUES ($1, $2, $3, $4, $5, $6)`, [rid(), qid, label, text, correct, `Why ${label}: worked reasoning.`]);
  }
  await sql(`INSERT INTO "QuestionTopic" ("questionId", "topicId") VALUES ($1, $2)`, [qid, topic.id]);

  await signIn(page, ADMIN.email, ADMIN.password, `/admin/questions/${qid}`);
  await expect(page.getByRole("heading", { name: "Human review" })).toBeVisible();
  const publish = async () => {
    await page.getByLabel("Status").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Set status" }).click();
  };
  await publish();
  await expect(page.getByRole("status").filter({ hasText: "drafted by AI" })).toBeVisible();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Tick the box" })).toBeVisible();
  await page.getByLabel(/I have checked the science/).check();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/^Approved/).first()).toBeVisible();

  await page.reload();
  await publish();
  await expect(page.getByRole("status").filter({ hasText: "Question set to published." })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("version-history")).toContainText(`Reviewed by ${ADMIN.email}`);
  await expect(page.getByTestId("version-history")).toContainText("(AI-drafted)");
  const audit = await sql<{ action: string }>(`SELECT action FROM "AuditLog" WHERE "entityId" = $1 ORDER BY "createdAt"`, [qid]);
  expect(audit.map((a) => a.action)).toEqual(["question.approve", "question.status"]);
});

test("password reset: the link works once, the token leaves the address bar, other sessions end", async ({ page, browser }) => {
  const email = uniqueEmail("m2-reset");
  await signUp(page, email);
  const [user] = await sql<{ id: string }>(`SELECT id FROM "User" WHERE email = $1`, [email]);
  const otherDevice = await browser.newContext();
  const other = await otherDevice.newPage();
  await signIn(other, email, "student-password-1");

  // Mail isn't configured in this environment, so mint the token the way createResetToken does.
  const token = randomBytes(32).toString("base64url");
  await sql(`INSERT INTO "PasswordResetToken" (id, "tokenHash", "userId", "expiresAt") VALUES ($1, $2, $3, (now() AT TIME ZONE 'UTC') + interval '1 hour')`, [rid(), createHash("sha256").update(token).digest("hex"), user.id]);

  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto(`/reset-password#token=${token}`);
  await expect(fresh.getByRole("button", { name: "Set new password" })).toBeEnabled();
  // Read once, then gone from the URL and from history.
  expect(await fresh.evaluate(() => window.location.hash)).toBe("");
  expect(fresh.url()).not.toContain(token);
  await fresh.getByLabel("New password").fill("brand-new-password-9");
  await fresh.getByRole("button", { name: "Set new password" }).click();
  await expect(fresh).toHaveURL(/\/dashboard/);

  // The other device was signed out; the old password no longer works; the link can't be reused.
  await other.goto("/dashboard");
  await expect(other).toHaveURL(/\/login/);
  const replay = await (await browser.newContext()).newPage();
  await replay.goto(`/reset-password#token=${token}`);
  await replay.getByLabel("New password").fill("another-password-99");
  await replay.getByRole("button", { name: "Set new password" }).click();
  await expect(formAlert(replay)).toContainText("invalid or has expired");
  await otherDevice.close();
});

test("open-redirect tricks in ?next= stay on this site after sign-in", async ({ page }) => {
  const email = uniqueEmail("m2-next");
  await signUp(page, email);
  await page.context().clearCookies();
  await page.goto(`/login?next=${encodeURIComponent("/\t/evil.example/x")}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("student-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/dashboard/);
});
