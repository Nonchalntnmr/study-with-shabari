import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ADMIN, signIn, signUp, sql, uniqueEmail } from "./helpers";

// 1×1 PNG, built in memory so the test has no fixture files.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test("admin authors a passage question with a figure, builds and publishes an exam, and a guest can take it", async ({ page, browser }) => {
  const tag = Date.now().toString(36);
  const passageTitle = `E2E passage ${tag}`;
  const stem = `In the passage's series circuit (${tag}), what happens to the current when a second resistor is added?`;
  const alt = `Circuit diagram ${tag}`;
  await signIn(page, ADMIN.email, ADMIN.password);
  // Next keeps recently visited pages mounted but hidden. Role queries skip hidden
  // elements; text assertions are filtered to visible matches.
  const box = (name: string) => page.getByRole("textbox", { name, exact: true });
  const pick = (name: string) => page.getByRole("combobox", { name, exact: true });
  const shown = (text: string) => page.getByText(text).filter({ visible: true });

  // Passage: create, then publish.
  await page.goto("/admin/passages/new");
  await pick("Section").selectOption("CP");
  await box("Title").fill(passageTitle);
  await box("Passage text").fill("A battery drives current through one resistor in series.\n\nA second, identical resistor is then added in series with the first.");
  await page.getByRole("button", { name: "Create draft passage" }).click();
  await expect(page).toHaveURL(/\/admin\/passages\/[a-z0-9]+\?created=1$/);
  await expect(shown("Created as a draft.")).toBeVisible();
  await pick("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Set status" }).click();
  await expect(shown("Passage set to published.")).toBeVisible();

  // Question on that passage, with a figure, topic and the correct answer marked.
  await page.getByRole("link", { name: "Add a question to this passage" }).click();
  await expect(page).toHaveURL(/\/admin\/questions\/new\?passage=/);
  await expect(pick("Passage")).toHaveValue(/.+/);
  await box("Question stem").fill(stem);
  for (const [l, t] of [["A", "It doubles"], ["B", "It stays the same"], ["C", "It halves"], ["D", "It drops to zero"]]) {
    await box(`Choice ${l} text`).fill(t);
    await box(`Why ${l} is right or wrong`).fill(l === "C" ? "Total resistance doubles, so I = V/R halves." : "Doesn't account for the doubled resistance.");
  }
  await page.getByRole("radio", { name: "C is correct" }).check();
  await box("Explanation").fill("Resistors in series add, so R doubles and the current halves by Ohm's law.");
  await page.getByRole("checkbox", { name: "Circuits", exact: true }).check();
  await page.locator("#q-figure").setInputFiles({ name: "circuit.png", mimeType: "image/png", buffer: PNG });
  await box("Alt text").fill(alt);
  await page.getByRole("button", { name: "Create draft question" }).click();
  await expect(page).toHaveURL(/\/admin\/questions\/[a-z0-9]+\?created=1$/);
  const questionId = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(page.getByRole("img", { name: alt })).toBeVisible();
  await pick("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Set status" }).click();
  await expect(shown("Question set to published.")).toBeVisible();

  const [q] = await sql<{ correct: string; topics: number; figureId: string | null }>(
    `SELECT (SELECT label FROM "Choice" WHERE "questionId" = q.id AND "isCorrect") AS correct,
            (SELECT count(*)::int FROM "QuestionTopic" WHERE "questionId" = q.id) AS topics, q."figureId"
     FROM "Question" q WHERE q.id = $1`,
    [questionId],
  );
  expect(q).toMatchObject({ correct: "C", topics: 1 });
  expect(q.figureId).toBeTruthy();

  // Exam built from that question.
  const slug = `e2e-exam-${tag}`;
  const examTitle = `E2E exam ${tag}`;
  await page.goto("/admin/exams/new");
  await box("Title").fill(examTitle);
  await box("URL slug").fill(slug);
  await box("Description").fill("One passage question, authored in the admin editor.");
  await pick("Section").selectOption("CP");
  await page.getByRole("spinbutton", { name: "Time limit (minutes)" }).fill("5");
  await page.getByRole("button", { name: "Create draft exam" }).click();
  await expect(page).toHaveURL(/\/admin\/exams\/[a-z0-9]+\?created=1$/);

  // Publishing an empty exam is refused; adding the question then publishing works.
  await pick("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Set status" }).click();
  await expect(shown("The exam has no questions.")).toBeVisible();
  await pick("Question to add").selectOption(questionId);
  await page.getByRole("button", { name: "Add question" }).click();
  await expect(shown("Question added.")).toBeVisible();
  await expect(page.getByRole("link", { name: stem.slice(0, 40), exact: false })).toBeVisible();
  await pick("Status").selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Set status" }).click();
  await expect(shown("Exam set to published.")).toBeVisible();

  // A guest finds it on /practice and sees the uploaded figure in the exam.
  const guestContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const guest = await guestContext.newPage();
  await guest.goto("/practice");
  await guest.getByRole("link", { name: new RegExp(examTitle) }).click();
  await guest.getByLabel(/^Untimed/).check();
  await guest.getByRole("button", { name: "Start practice set" }).click();
  await expect(guest).toHaveURL(/\/exam\/[a-z0-9]+$/);
  await expect(guest.getByText(stem)).toBeVisible();
  await expect(guest.getByText(passageTitle)).toBeVisible();
  const figure = guest.getByRole("img", { name: alt });
  await expect(figure).toBeVisible();
  expect(await figure.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);
  await guestContext.close();

  // Every step was audited.
  const actions = (await sql<{ action: string }>(`SELECT action FROM "AuditLog" WHERE "actorEmail" = $1 AND "createdAt" > now() - interval '5 minutes'`, [ADMIN.email])).map((r) => r.action);
  for (const a of ["passage.create", "passage.status", "question.create", "question.status", "exam.create", "exam.items", "exam.status"]) expect(actions).toContain(a);
});

test("import: shows problems for a bad file, imports a good one as draft, refuses to overwrite published content", async ({ page }) => {
  const tag = Date.now().toString(36);
  const topic = `e2e-topic-${tag}`;
  const good = {
    version: 1,
    topics: [{ slug: topic, name: `E2E topic ${tag}`, section: "CP" }],
    exams: [
      {
        slug: `e2e-import-${tag}`,
        title: `Imported set ${tag}`,
        description: "Imported through the admin screen.",
        section: "CP",
        timeLimitMinutes: 5,
        items: [
          {
            type: "discrete",
            id: `e2e-q-${tag}`,
            stem: "Which quantity is conserved in an elastic collision?",
            choices: [
              { label: "A", text: "Kinetic energy and momentum", correct: true },
              { label: "B", text: "Only momentum" },
              { label: "C", text: "Only kinetic energy" },
              { label: "D", text: "Neither" },
            ],
            explanation: "Elastic collisions conserve both momentum and kinetic energy.",
            topics: [topic],
          },
        ],
      },
    ],
  };
  const bad = structuredClone(good);
  bad.exams[0].items[0].topics = ["no-such-topic"];

  await signIn(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/import");
  const box = page.getByLabel("Or paste JSON");
  const result = page.getByRole("status");

  await box.fill(JSON.stringify(bad));
  await page.getByRole("button", { name: "Validate" }).click();
  await expect(result).toContainText("1 problem found.");
  await expect(result).toContainText('unknown topic "no-such-topic"');

  await box.fill(JSON.stringify(good));
  await page.getByRole("button", { name: "Validate" }).click();
  await expect(result).toContainText("Valid. Nothing has been imported yet.");
  await expect(result).toContainText("1 exam · 0 passages · 1 question · 1 topic");
  expect(await sql(`SELECT 1 FROM "Exam" WHERE slug = $1`, [good.exams[0].slug])).toHaveLength(0);

  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(result).toContainText("Imported as draft.");
  const [row] = await sql<{ exam: string; question: string }>(
    `SELECT e.status AS exam, q.status AS question FROM "Exam" e, "Question" q WHERE e.slug = $1 AND q."externalId" = $2`,
    [good.exams[0].slug, `e2e-q-${tag}`],
  );
  expect(row).toEqual({ exam: "DRAFT", question: "DRAFT" });

  // The shipped sample bank is published in this environment, so re-importing it must be refused.
  await box.fill(readFileSync("content/samples/sample-bank.json", "utf8"));
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(result).toContainText("This file would change 3 published exams and 24 published questions.");
  const [{ n }] = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM "Exam" WHERE status = 'PUBLISHED' AND "isSample"`);
  expect(n).toBe(3);
});

test("students get the not-found page on every editor", async ({ page }) => {
  await signUp(page, uniqueEmail("editor-snoop"));
  for (const path of ["/admin/questions/new", "/admin/passages/new", "/admin/exams/new", "/admin/import", "/admin/pricing", "/admin/testimonials", "/admin/resources", "/admin/topics"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "This page doesn’t exist." }), path).toBeVisible();
    await expect(page.getByRole("button", { name: /Create|Import|Save/ }), path).toHaveCount(0);
  }
});
