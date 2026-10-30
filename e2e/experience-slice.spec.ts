import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The slice's "moment of understanding": Shabari's Q6 then Q2, checked on the server. Before an
// answer, the page carries no answer key and no explanation (same check as dopamine-lesson.spec.ts).

const EXPLANATIONS = [
  "Tyrosine hydroxylase converts tyrosine to L-DOPA and controls the pathway's overall rate",
  "L-DOPA enters through amino acid transporters and is converted in the brain",
  "Dopamine normally inhibits prolactin; blocking it raises prolactin",
  "Blocking DAT prevents reuptake, so dopamine stays in the synapse longer",
  "Once a reward is fully predicted, the dopamine burst moves to the cue",
  "the catechol –OH groups (pKa ≈ 9–10+) are mostly neutral",
];

test("slice: no answer key or explanation in the HTML before answering", async ({ request }) => {
  for (const path of ["/experience/slice", "/experience/specimen", "/experience/synapse"]) {
    const html = (await (await request.get(path)).text()).replace(/&#x27;|&#39;/g, "'");
    for (const e of EXPLANATIONS) expect(html, `${path}: ${e}`).not.toContain(e);
    // No answer index travels with the questions.
    expect(html).not.toMatch(/"answer":\s*\d/);
    expect(html).not.toMatch(/\\"answer\\":\s*\d/);
  }
});

test("slice: pick, say how sure, see her explanation, explore the charge, try the related question, see what was learned", async ({ page }) => {
  await page.goto("/experience/slice");
  await expect(page.getByTestId("charge-explorer")).toHaveCount(0);
  const q6 = page.locator('[data-question="q6"]');
  await q6.scrollIntoViewIfNeeded();
  await q6.getByText("0", { exact: true }).click();
  await q6.getByText("Sure", { exact: true }).click();
  await q6.getByRole("button", { name: "Check answer" }).click();
  const reveal = page.getByTestId("reveal-q6");
  await expect(reveal).toContainText("Not quite. The answer is C.");
  await expect(reveal).toContainText(EXPLANATIONS[5]);
  await expect(reveal).toContainText("You were sure");

  // The concept: drag the pH (here with the keyboard) and the amine loses its proton above the pKa.
  const slider = page.getByRole("slider", { name: "pH" });
  await expect(page.getByTestId("charge-explorer")).toContainText("99.7%");
  await slider.focus();
  for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("11.4");
  await expect(page.getByTestId("charge-explorer")).toContainText("3.8%");

  await page.getByRole("button", { name: "Try a related question" }).click();
  const q2 = page.locator('[data-question="q2"]');
  await q2.getByText("dopamine cannot cross the blood–brain barrier").click();
  await q2.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByTestId("reveal-q2")).toContainText("Correct.");
  const learned = page.getByTestId("learned");
  await expect(learned).toContainText("What you learned");
  await expect(learned).toContainText("1 of 2 right");
  // Right or wrong only: nothing that looks like a scaled score.
  await expect(learned).not.toContainText(/\b(4[7-9]\d|5[0-2]\d)\b/);

  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("slice: the closing CTA books the MCAT consult", async ({ page }) => {
  await page.goto("/experience/slice");
  await expect(page.locator("#book-h")).toHaveText("Start with a free consult call.");
  await expect(page.locator('section[aria-labelledby="book-h"] a[data-book-cta]')).toHaveAttribute("href", "/book?service=mcat");
});
