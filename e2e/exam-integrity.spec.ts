import { expect, test, type Page } from "@playwright/test";
import { answerKey, choose, signIn, signUp, sql, startSet, uniqueEmail, waitSaved } from "./helpers";

// Failure modes of the exam runner, each with its expected behaviour:
// a student must never silently lose an answer they made.

const SLUG = "ps-sample-set-1";
const key = answerKey(SLUG);
const attemptId = (page: Page) => page.url().split("/exam/")[1].split(/[/?#]/)[0];

async function selectedOnServer(id: string, n: number): Promise<string | null> {
  const rows = await sql<{ label: string | null }>(
    `SELECT c.label FROM "Response" r LEFT JOIN "Choice" c ON c.id = r."selectedChoiceId"
     WHERE r."attemptId" = $1 AND r."questionId" = (SELECT "questionOrder"[$2] FROM "Attempt" WHERE id = $1)`,
    [id, n],
  );
  return rows[0]?.label ?? null;
}

test("rapid answer changes: the last choice is the one saved", async ({ page }) => {
  await startSet(page, SLUG, "Untimed");
  for (const l of ["A", "B", "C", "D", "A", "C", "B", "D", "C"]) await choose(page, l);
  await waitSaved(page);
  expect(await selectedOnServer(attemptId(page), 1)).toBe("C");
  await page.reload();
  await expect(page.getByRole("radio", { name: /^C\. / })).toBeChecked();
});

test("two tabs: a change in one shows in the other, and the newest answer wins", async ({ page, context }) => {
  await startSet(page, SLUG, "Untimed");
  const url = page.url();
  const tab2 = await context.newPage();
  await tab2.goto(url);
  await expect(tab2.getByText(/Question 1 of/)).toBeVisible();

  await choose(page, "A");
  await expect(tab2.getByRole("radio", { name: /^A\. / })).toBeChecked();
  await choose(tab2, "D");
  await waitSaved(tab2);
  await expect(page.getByRole("radio", { name: /^D\. / })).toBeChecked();
  // The first tab saving something else later must not resurrect "A".
  await page.getByRole("button", { name: "Flag for review" }).click();
  await waitSaved(page);
  expect(await selectedOnServer(attemptId(page), 1)).toBe("D");
});

test("offline, then online: answers are kept on the device and saved on reconnect", async ({ page, context }) => {
  await startSet(page, SLUG, "Untimed");
  await context.setOffline(true);
  await choose(page, "B");
  await expect(page.getByTestId("save-status")).toContainText("Offline", { timeout: 10_000 });
  const backup = await page.evaluate((id) => localStorage.getItem(`sws:attempt:${id}`), attemptId(page));
  expect(backup).toContain('"selectedChoiceId"');
  await context.setOffline(false);
  await expect(page.getByTestId("save-status")).toHaveText(/Saved/, { timeout: 15_000 });
  expect(await selectedOnServer(attemptId(page), 1)).toBe("B");
});

test("failed server writes (5xx) are retried; nothing is dropped", async ({ page }) => {
  await startSet(page, SLUG, "Untimed");
  let failures = 0;
  await page.route("**/api/attempts/*/sync", async (route) => {
    if (failures < 2) {
      failures++;
      return route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"unavailable"}' });
    }
    return route.continue();
  });
  await choose(page, "C");
  await expect(page.getByTestId("save-status")).toContainText("Offline", { timeout: 10_000 });
  await expect(page.getByTestId("save-status")).toHaveText(/Saved/, { timeout: 20_000 });
  expect(failures).toBe(2);
  expect(await selectedOnServer(attemptId(page), 1)).toBe("C");
});

test("refresh during autosave: the answer survives", async ({ page }) => {
  await startSet(page, SLUG, "Untimed");
  // Hold every autosave so the reload happens with the save still in flight.
  await page.route("**/api/attempts/*/sync", async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue().catch(() => {});
  });
  await choose(page, "D");
  await page.reload();
  await page.unroute("**/api/attempts/*/sync");
  await expect(page.getByRole("radio", { name: /^D\. / })).toBeChecked();
  await waitSaved(page);
  expect(await selectedOnServer(attemptId(page), 1)).toBe("D");
});

test("refresh during submit: the attempt ends up submitted with the last answer, or still open with it", async ({ page }) => {
  await startSet(page, SLUG, "Untimed");
  const id = attemptId(page);
  await choose(page, key[0]);
  await waitSaved(page);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  // The last answer goes only with the submit request, which is slow; the page reloads mid-flight.
  await page.getByRole("button", { name: "Question 2" }).click();
  await choose(page, key[1]);
  await page.route("**/api/attempts/*/submit", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue().catch(() => {});
  });
  await page.route("**/api/attempts/*/sync", (route) => route.abort());
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByRole("button", { name: "Submit and see results" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(300);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.reload();
  const [row] = await sql<{ status: string; correct: number | null }>(`SELECT status, "correctCount" AS correct FROM "Attempt" WHERE id = $1`, [id]);
  if (row.status === "SUBMITTED") {
    expect(row.correct).toBe(2);
    await expect(page).toHaveURL(/\/results$/);
  } else {
    // The submit didn't land: the runner reopens with both answers (one from the on-device copy).
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await expect(page.getByText(/2 of \d+ answered/)).toBeVisible();
  }
});

test("duplicate submits return the first result", async ({ page }) => {
  await startSet(page, SLUG, "Untimed");
  const id = attemptId(page);
  await choose(page, key[0]);
  await waitSaved(page);
  const statuses = await page.evaluate(async (attempt) => {
    const send = () => fetch(`/api/attempts/${attempt}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "manual" }) }).then((r) => r.json());
    return Promise.all([send(), send(), send()]);
  }, id);
  expect(statuses.every((s) => s.status === "submitted")).toBe(true);
  const [row] = await sql<{ correct: number }>(`SELECT "correctCount" AS correct FROM "Attempt" WHERE id = $1`, [id]);
  expect(row.correct).toBe(1);
  expect((await sql(`SELECT 1 FROM "Response" WHERE "attemptId" = $1`, [id])).length).toBe(key.length);
});

test("a device clock jump can't end a timed attempt early; the server's deadline rules", async ({ page }) => {
  await startSet(page, SLUG, "Timed");
  const id = attemptId(page);
  // Jump the device clock three hours ahead, as a manual change or a bad NTP sync would.
  await page.evaluate(() => {
    const real = Date.now.bind(Date);
    Date.now = () => real() + 3 * 3600_000;
  });
  await page.waitForTimeout(2500);
  await expect(page).toHaveURL(/\/exam\/[a-z0-9]+$/);
  await expect(page.getByTestId("exam-clock")).toHaveText(/1[0-9]:\d\d/);
  // Even a forged timeout submit is refused while the server says time remains.
  const r = await page.evaluate(async (attempt) => (await fetch(`/api/attempts/${attempt}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"reason":"timeout"}' })).json(), id);
  expect(r.status).toBe("not_expired");
  const [row] = await sql<{ status: string }>(`SELECT status FROM "Attempt" WHERE id = $1`, [id]);
  expect(row.status).toBe("IN_PROGRESS");
});

test("session expires mid-exam: answers stay on the device, and signing in carries on", async ({ page }) => {
  const email = uniqueEmail("m2-expiry");
  await signUp(page, email);
  await startSet(page, SLUG, "Untimed");
  const id = attemptId(page);
  await choose(page, "A");
  await waitSaved(page);
  await sql(`DELETE FROM "Session" WHERE "userId" = (SELECT id FROM "User" WHERE email = $1)`, [email]);

  await page.getByRole("button", { name: "Next" }).click();
  await choose(page, "B");
  await expect(page.getByTestId("save-status")).toContainText("You’re signed out", { timeout: 10_000 });
  const backup = await page.evaluate((a) => localStorage.getItem(`sws:attempt:${a}`), id);
  expect(backup).toContain('"selectedChoiceId"');

  await page.getByRole("link", { name: "Sign in to keep saving" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("student-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`/exam/${id}$`));
  await waitSaved(page);
  expect(await selectedOnServer(id, 2)).toBe("B");
});

test("guest to account: practice started as a guest keeps saving after signing up", async ({ page }) => {
  await startSet(page, SLUG, "Untimed");
  const id = attemptId(page);
  await choose(page, "A");
  await waitSaved(page);
  await signUp(page, uniqueEmail("m2-claim"));
  await page.goto(`/exam/${id}`);
  await page.getByRole("button", { name: "Next" }).click();
  await choose(page, "C");
  await waitSaved(page);
  const [row] = await sql<{ user: string | null }>(`SELECT "userId" AS user FROM "Attempt" WHERE id = $1`, [id]);
  expect(row.user).not.toBeNull();
  expect(await selectedOnServer(id, 2)).toBe("C");
});

test("admin edits a published question mid-attempt: the student keeps the version they started", async ({ page, browser }) => {
  await startSet(page, SLUG, "Untimed");
  const id = attemptId(page);
  const [q] = await sql<{ id: string; stem: string }>(`SELECT q.id, q.stem FROM "Question" q WHERE q.id = (SELECT "questionOrder"[1] FROM "Attempt" WHERE id = $1)`, [id]);

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, "admin@e2e.test", "e2e-admin-password-123", `/admin/questions/${q.id}`);
  await admin.getByLabel("Question stem").fill(`${q.stem} (revised)`);
  await admin.getByRole("button", { name: "Save question" }).click();
  await expect(admin.getByRole("status").filter({ hasText: "Question saved." })).toBeVisible();
  await admin.reload();
  await expect(admin.getByTestId("version-history")).toContainText("Question stem");

  await page.reload();
  await expect(page.getByText(q.stem, { exact: true })).toBeVisible();
  await expect(page.getByText("(revised)")).toHaveCount(0);
  await admin.close();
});
