import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { answerKey, answerAll, choose, signUp, startSet, submitFromReview, uniqueEmail } from "./helpers";

// Amendment 4, item 9: no correct answer, isCorrect flag, rationale or explanation may reach the
// browser before the student submits (practice and exam) or answers (lesson). Every page and response
// a guest or a signed-in student loads is checked: the raw HTML (which carries the React Server
// Component payload) and the autosave JSON. A positive control proves the detector sees them once
// they're allowed: on the results and reveal screens.

type Q = { stem: string; explanation: string; choices: { text: string; rationale?: string }[] };
const bank = JSON.parse(readFileSync("content/samples/sample-bank.json", "utf8"));
const set = bank.exams.find((e: { slug: string }) => e.slug === "cp-sample-set-1");
const setQuestions: Q[] = set.items.flatMap((i: { type: string; questions?: Q[] } & Q) => (i.type === "passage" ? i.questions : [i]));
const lesson = JSON.parse(readFileSync("content/lessons/dopamine.json", "utf8"));
const firstLessonQ: Q = lesson.questions.find((q: { id: string }) => q.id === lesson.steps.find((s: { question?: string }) => s.question).question);

const KEY_FIELDS = /\\?"(isCorrect|rationale|explanation|correctChoiceId|correct)\\?"\s*:/;

/** Letters-only text, with HTML entities and JSON escapes treated as breaks. */
const words = (s: string) =>
  s
    .replace(/&#x?[0-9a-f]+;|&[a-z]+;|\\u[0-9a-f]{4}|\\[nrt"]/gi, " ")
    .replace(/[^A-Za-z]+/g, " ")
    .trim()
    .toLowerCase();

/** A six-word phrase from each hidden text that doesn't also occur in what the student is allowed to see. */
function fingerprints(hidden: string[], visible: string): string[] {
  const seen = words(visible);
  return hidden.flatMap((text) => {
    const w = words(text).split(" ");
    for (let i = 0; i + 6 <= w.length; i++) {
      const fp = w.slice(i, i + 6).join(" ");
      if (w.slice(i, i + 6).every((x) => x.length > 1) && !seen.includes(fp)) return [fp];
    }
    return [];
  });
}

const setVisible = setQuestions.map((q) => [q.stem, ...q.choices.map((c) => c.text)].join(" ")).join(" ") + " " + set.items.map((i: { body?: string }) => i.body ?? "").join(" ");
const setSecrets = fingerprints(
  setQuestions.flatMap((q) => [q.explanation, ...q.choices.map((c) => c.rationale ?? "")]),
  setVisible,
);
const lessonSecrets = fingerprints(
  [firstLessonQ.explanation, ...firstLessonQ.choices.map((c) => c.rationale ?? "")],
  [firstLessonQ.stem, ...firstLessonQ.choices.map((c) => c.text), ...lesson.steps.map((s: { body?: string }) => s.body ?? "")].join(" "),
);

function assertNoKey(where: string, body: string, secrets: string[]) {
  expect(body, `${where}: answer-key field`).not.toMatch(KEY_FIELDS);
  const text = words(body);
  expect(
    secrets.filter((fp) => text.includes(fp)),
    `${where}: explanation or rationale text`,
  ).toEqual([]);
}

async function rawHtml(page: Page, path: string): Promise<string> {
  const res = await page.request.get(path);
  expect(res.status(), path).toBeLessThan(500);
  return res.text();
}

test.beforeAll(() => {
  // The detector needs something to look for.
  expect(setSecrets.length).toBeGreaterThan(10);
  expect(lessonSecrets.length).toBeGreaterThan(2);
});

for (const who of ["guest", "student"] as const) {
  test(`answer key: nothing leaks before submission, as a ${who}`, async ({ page }) => {
    test.setTimeout(120_000);
    if (who === "student") await signUp(page, uniqueEmail("keys"));

    // Public pages, the practice list and the set's start page.
    for (const path of ["/", "/mcat", "/admissions", "/practice", "/practice/cp-sample-set-1", "/lessons/dopamine"]) {
      assertNoKey(path, await rawHtml(page, path), setSecrets);
    }

    // The exam runner, as served, and every autosave response while answering.
    const syncBodies: string[] = [];
    page.on("response", async (r) => {
      if (/\/api\/attempts\/[^/]+\/sync$/.test(r.url())) syncBodies.push(await r.text().catch(() => ""));
    });
    await startSet(page, "cp-sample-set-1", "Untimed");
    const examPath = new URL(page.url()).pathname;
    assertNoKey(`${examPath} (HTML)`, await rawHtml(page, examPath), setSecrets);
    assertNoKey(`${examPath} (DOM)`, await page.content(), setSecrets);
    const key = answerKey("cp-sample-set-1");
    await answerAll(page, key.length, (i) => key[i]);
    await expect(page.getByTestId("save-status")).toHaveText(/Saved/, { timeout: 10_000 });
    expect(syncBodies.length).toBeGreaterThan(0);
    for (const b of syncBodies) assertNoKey("autosave response", b, setSecrets);

    // Positive control: after submitting, the explanations are there and the detector sees them.
    await submitFromReview(page);
    await expect(page.getByTestId("result-item").first()).toBeVisible();
    const results = words(await page.content());
    expect(setSecrets.filter((fp) => results.includes(fp)).length).toBeGreaterThan(5);

    // The lesson: the teach step and the first question, before answering.
    await page.goto("/lessons/dopamine");
    await page.getByRole("button", { name: "Start the lesson" }).click();
    await expect(page.getByTestId("step-count")).toHaveText("Step 1 of 13");
    const lessonBase = new URL(page.url()).pathname;
    assertNoKey("lesson teach step", await rawHtml(page, `${lessonBase}?step=0`), lessonSecrets);
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: "Check answer" })).toBeVisible();
    assertNoKey("lesson question (HTML)", await rawHtml(page, `${lessonBase}?step=1`), lessonSecrets);
    assertNoKey("lesson question (DOM)", await page.content(), lessonSecrets);

    // Positive control: the reveal shows them once answered.
    await choose(page, "A");
    await page.locator("label", { hasText: /^Sure$/ }).click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByTestId("reveal")).toBeVisible();
    const reveal = words(await page.content());
    expect(lessonSecrets.filter((fp) => reveal.includes(fp)).length).toBeGreaterThan(0);

    // Admin previews are not reachable without the admin role.
    for (const path of ["/admin", "/admin/lessons", "/admin/content"]) {
      const res = await page.request.get(path, { maxRedirects: 0 });
      expect([200, 302, 303, 307, 404], path).toContain(res.status());
      assertNoKey(path, await res.text(), [...setSecrets, ...lessonSecrets]);
    }
  });
}
