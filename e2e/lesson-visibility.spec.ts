import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ADMIN, finishLesson, lessonKey, signIn, signUp, sql, uniqueEmail } from "./helpers";

// A lesson that isn't approved is a real 404 on its public URL, for everyone, signed in or not:
// /lessons/[slug] decides from cached data before anything streams. Admins preview drafts under
// /admin/lessons/[id]/preview instead, and approving makes the lesson appear at once.

const NOT_FOUND = "This page doesn’t exist.";

/** A fresh unapproved lesson: the dopamine lesson's steps under a new slug, in REVIEW like an AI import. */
async function draftLesson() {
  const tag = randomBytes(5).toString("hex");
  const lesson = { id: `e2edraft${tag}`, slug: `e2e-draft-${tag}`, title: `Draft lesson ${tag}` };
  await sql(
    `INSERT INTO "Lesson" (id, slug, title, section, summary, objectives, status, "authoredBy", "updatedAt")
     SELECT $1, $2, $3, section, summary, objectives, 'REVIEW', "authoredBy", now() FROM "Lesson" WHERE slug = 'dopamine'`,
    [lesson.id, lesson.slug, lesson.title],
  );
  await sql(
    `INSERT INTO "LessonStep" (id, "lessonId", position, kind, concept, title, body, figure, "questionId", "misconceptionId")
     SELECT $1 || position, $2, position, kind, concept, title, body, figure, "questionId", "misconceptionId"
     FROM "LessonStep" WHERE "lessonId" = (SELECT id FROM "Lesson" WHERE slug = 'dopamine')`,
    [`${lesson.id}s`, lesson.id],
  );
  return { ...lesson, tag };
}

test("guests get a real 404 for an unapproved lesson and an unknown slug, on the first visit", async ({ request }) => {
  const draft = await draftLesson();
  for (const path of [
    `/lessons/${draft.slug}`,
    `/lessons/${draft.slug}/a/some-attempt`,
    `/lessons/${draft.slug}/a/some-attempt/result`,
    `/lessons/no-such-lesson-${draft.tag}`,
    `/lessons/no-such-lesson-${draft.tag}/a/some-attempt`,
  ]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(404);
    const html = await res.text();
    expect(html, path).toContain(NOT_FOUND);
    expect(html, path).not.toContain(draft.title);
    // A second visit is answered from the cache, with the same status.
    expect((await request.get(path, { maxRedirects: 0 })).status(), `${path} (again)`).toBe(404);
  }

  const published = await request.get("/lessons/dopamine");
  expect(published.status()).toBe(200);
  expect(await published.text()).toContain("Start the lesson");
});

test("an admin previews a draft under /admin, the public URL stays 404, and approving publishes it at once", async ({ page, browser }) => {
  const draft = await draftLesson();
  const funnel = async () => (await sql<{ n: number }>(`SELECT coalesce(sum(count), 0)::int AS n FROM "FunnelDaily"`))[0].n;
  const before = await funnel();

  // Next keeps recently visited pages mounted but hidden, so the badge check counts visible ones.
  const badge = page.getByTestId("draft-badge").filter({ visible: true });
  await signIn(page, ADMIN.email, ADMIN.password);
  // Signed in as an admin, the public URL is still a 404: it never reads the session.
  expect((await page.request.get(`/lessons/${draft.slug}`, { maxRedirects: 0 })).status()).toBe(404);

  await page.goto(`/admin/lessons/${draft.id}`);
  await page.getByRole("link", { name: "Preview the draft" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/lessons/${draft.id}/preview$`));
  await expect(badge).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: draft.title })).toBeVisible();

  await page.getByRole("button", { name: "Start the preview" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/lessons/${draft.id}/preview/a/[a-z0-9]+$`));
  const attemptId = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(badge).toBeVisible();
  await finishLesson(page, lessonKey(), "Sure");
  await expect(page).toHaveURL(new RegExp(`/admin/lessons/${draft.id}/preview/a/${attemptId}/result$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What this lesson showed");
  await expect(badge).toBeVisible();

  // A preview attempt of the draft, owned by the admin, with every answer graded and nothing counted.
  const [attempt] = await sql<{ lessonVersionId: string | null; previewLessonId: string; email: string; answers: number; completed: boolean }>(
    `SELECT a."lessonVersionId", a."previewLessonId", u.email, (SELECT count(*)::int FROM "LessonAnswer" WHERE "attemptId" = a.id) AS answers, a."completedAt" IS NOT NULL AS completed
     FROM "LessonAttempt" a JOIN "User" u ON u.id = a."userId" WHERE a.id = $1`,
    [attemptId],
  );
  expect(attempt).toEqual({ lessonVersionId: null, previewLessonId: draft.id, email: ADMIN.email, answers: lessonKey().length, completed: true });
  expect(await funnel()).toBe(before);
  // The preview attempt doesn't open on the public URL either.
  expect((await page.request.get(`/lessons/${draft.slug}/a/${attemptId}`, { maxRedirects: 0 })).status()).toBe(404);

  // A guest (the 404 above is cached) sees the lesson as soon as an admin approves it.
  const guest = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  expect((await guest.request.get(`/lessons/${draft.slug}`)).status()).toBe(404);
  await page.goto(`/admin/lessons/${draft.id}`);
  await page.getByLabel(/I have read every step/).check();
  await page.getByRole("button", { name: "Approve and publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Published as version 1." })).toBeVisible();
  const live = await guest.request.get(`/lessons/${draft.slug}`);
  expect(live.status()).toBe(200);
  const html = await live.text();
  expect(html).toContain(draft.title);
  expect(html).not.toContain('data-testid="draft-badge"');
  await guest.close();
});

test("only admins can open a draft preview", async ({ page, browser }) => {
  const draft = await draftLesson();
  const guest = await (await browser.newContext({ baseURL: test.info().project.use.baseURL })).newPage();
  await guest.goto(`/admin/lessons/${draft.id}/preview`);
  await expect(guest).toHaveURL(/\/login/);

  await signUp(page, uniqueEmail("preview-snoop"));
  await page.goto(`/admin/lessons/${draft.id}/preview`);
  await expect(page.getByRole("heading", { name: NOT_FOUND })).toBeVisible();
  await expect(page.getByText(draft.title)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start the preview" })).toHaveCount(0);
});
