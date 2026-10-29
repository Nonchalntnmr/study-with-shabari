import { describe, expect, it } from "vitest";
import { inquirySchema } from "./schema";
import { adminNotification, headerSafe, inquiryAcknowledgement } from "../email/templates";

const valid = { name: "Alex Kim", email: "Alex@Example.com ", kind: "CONSULTATION", message: "I am retaking in March and want a plan." };

describe("inquirySchema", () => {
  it("normalizes email case and whitespace", () => {
    const r = inquirySchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("alex@example.com");
  });
  it("rejects a bad email, a short message and an unknown topic", () => {
    expect(inquirySchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, message: "hi" }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...valid, kind: "HACK" }).success).toBe(false);
  });
  it("caps the message length", () => {
    expect(inquirySchema.safeParse({ ...valid, message: "x".repeat(5001) }).success).toBe(false);
  });
});

describe("email templates", () => {
  it("strips newlines so a name cannot inject mail headers", () => {
    expect(headerSafe("Alex\r\nBcc: victim@example.com")).toBe("Alex Bcc: victim@example.com");
  });
  it("keeps the subject on one line even with a hostile name", () => {
    const n = adminNotification({ name: "A\nBcc: x@y.z", email: "a@b.co", kind: "OTHER", message: "hello there friend" }, "https://x/admin");
    expect(n.subject.includes("\n")).toBe(false);
  });
  it("acknowledgement greets by first name and never echoes the message", () => {
    const a = inquiryAcknowledgement({ name: "Alex Kim", email: "a@b.co", kind: "OTHER", message: "My question" }, "Shabari");
    expect(a.text.startsWith("Hi Alex,")).toBe(true);
    // Echoing would let anyone relay their own text to any inbox from this domain.
    expect(a.text.includes("My question")).toBe(false);
  });
});
