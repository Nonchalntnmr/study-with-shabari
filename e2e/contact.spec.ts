import { expect, test } from "@playwright/test";
import { formAlert, ADMIN, signIn, sql, uniqueEmail } from "./helpers";

test("17. contact form validates, stores the inquiry, and never sends from an unverified sender", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(formAlert(page)).toContainText("Please fix the highlighted fields");
  await expect(page.getByText("Please enter your name.")).toBeVisible();

  const email = uniqueEmail("prospect");
  await page.getByLabel("Your name").fill("Jordan Prospect");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("What’s this about?").selectOption("TUTORING");
  await page.getByLabel("MCAT test date (optional)").fill("April 2027");
  await page.getByLabel("Message").fill("I'm testing in April and want help with Chem/Phys passages.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Thanks, your message was sent.");

  const [inq] = await sql<{ id: string; kind: string; status: string }>(`SELECT id, kind, status FROM "Inquiry" WHERE email = $1`, [email]);
  expect(inq).toMatchObject({ kind: "TUTORING", status: "NEW" });
  // No verified mail transport in this environment: both messages are recorded, none sent.
  const emails = await sql<{ template: string; status: string }>(`SELECT template, status FROM "EmailMessage" WHERE "inquiryId" = $1 ORDER BY template`, [inq.id]);
  expect(emails).toEqual([
    { template: "inquiry-ack", status: "NOT_CONFIGURED" },
    { template: "inquiry-admin", status: "NOT_CONFIGURED" },
  ]);

  await signIn(page, ADMIN.email, ADMIN.password, "/admin/inquiries");
  const card = page.locator("li", { hasText: email });
  await expect(card).toContainText("Jordan Prospect");
  await expect(card).toContainText("not configured");

  // Deleting on request removes the message and the email records that hold the address.
  await card.getByRole("button", { name: "Delete" }).click();
  await expect(card.getByRole("status")).toContainText("Tick the box");
  await card.getByLabel(/Delete this message/).check();
  await card.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("li", { hasText: email })).toHaveCount(0);
  expect(await sql(`SELECT 1 FROM "Inquiry" WHERE email = $1`, [email])).toEqual([]);
  expect(await sql(`SELECT 1 FROM "EmailMessage" WHERE "to" = $1`, [email])).toEqual([]);
});

test("contact form honeypot drops bot submissions", async ({ page }) => {
  const email = uniqueEmail("bot");
  await page.goto("/contact");
  await page.getByLabel("Your name").fill("Bot");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Message").fill("Buy cheap things now, great deals for everyone.");
  await page.locator("#website").fill("http://spam.example", { force: true });
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("Thanks");
  expect(await sql(`SELECT 1 FROM "Inquiry" WHERE email = $1`, [email])).toHaveLength(0);
});
