import { expect, test } from "@playwright/test";

// The free dopamine lesson (src/app/(site)/dopamine): her sections, then six questions whose
// explanation appears only after an answer, checked on the server.
const EXPLANATIONS = [
  "Tyrosine hydroxylase converts tyrosine to L-DOPA and controls the pathway's overall rate",
  "L-DOPA enters through amino acid transporters and is converted in the brain",
  "Dopamine normally inhibits prolactin; blocking it raises prolactin",
  "Blocking DAT prevents reuptake, so dopamine stays in the synapse longer",
  "Once a reward is fully predicted, the dopamine burst moves to the cue",
  "the catechol –OH groups (pKa ≈ 9–10+) are mostly neutral",
];

test("dopamine lesson: every section, no explanation before an answer, then the right feedback", async ({ page, request }) => {
  const html = await (await request.get("/dopamine")).text();
  for (const e of EXPLANATIONS) expect(html.replace(/&#x27;|&#39;/g, "'"), e).not.toContain(e);

  await page.goto("/dopamine");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dopamine: One Molecule, Every MCAT Section");
  for (const t of ["What it is", "How it’s made (catecholamine synthesis)", "How it’s cleared", "Receptors", "The four pathways", "Clinical connections", "Psych/Soc connection: reward prediction error", "Practice questions"]) {
    await expect(page.getByRole("heading", { level: 2, name: new RegExp(t.replace(/[()/]/g, "\\$&")) })).toBeVisible();
  }

  const q1 = page.locator("li", { has: page.getByText("The rate-limiting enzyme in dopamine synthesis is:") });
  await q1.getByRole("button", { name: /DOPA decarboxylase/ }).click();
  await expect(q1.getByRole("status")).toContainText("Not quite. The answer is B.");
  await expect(q1.getByRole("status")).toContainText(EXPLANATIONS[0]);
  await expect(q1.getByRole("button", { name: /tyrosine hydroxylase/ })).toBeDisabled();

  const q2 = page.locator("li", { has: page.getByText("Parkinson's patients are given L-DOPA instead of dopamine because:") });
  await q2.getByRole("button", { name: /cannot cross the blood–brain barrier/ }).click();
  await expect(q2.getByRole("status")).toContainText("Correct.");

  await expect(page.getByRole("link", { name: "Book a free 15-min call" }).last()).toHaveAttribute("href", "/book?service=mcat");
});

test("dopamine lesson: linked from the home hero's 3D model, the MCAT page and the footer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Explore the free dopamine lesson" })).toHaveAttribute("href", "/dopamine");
  await expect(page.locator("footer").getByRole("link", { name: "Free dopamine lesson" })).toHaveAttribute("href", "/dopamine");
  await page.goto("/mcat");
  await expect(page.getByRole("link", { name: "Read the free dopamine lesson" })).toHaveAttribute("href", "/dopamine");
});
