"use server";

import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIpKey } from "@/lib/security/request";
import { hmac } from "@/lib/security/hash";
import { contactEmail, siteUrl } from "@/lib/site";
import { sendEmail } from "@/lib/email/transport";
import { adminNotification, inquiryAcknowledgement } from "@/lib/email/templates";
import { fieldErrors, inquirySchema, type FieldErrors } from "./schema";

export type InquiryResult =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string; errors?: FieldErrors };

const IDLE: InquiryResult = { status: "idle" };
export const initialInquiryState = IDLE;

export async function submitInquiry(_prev: InquiryResult, formData: FormData): Promise<InquiryResult> {
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  // Bots fill the hidden field. Answer as if it worked so they learn nothing.
  if (input.website) return { status: "ok", message: "Thanks, your message was sent." };

  const limit = await rateLimit(`inquiry:${await clientIpKey()}`, 5, 3600);
  if (!limit.ok) {
    return { status: "error", message: "You've sent several messages recently. Please try again in a little while." };
  }

  const inquiry = await db.inquiry.create({
    data: {
      name: input.name,
      email: input.email,
      kind: input.kind,
      testDate: input.testDate ?? null,
      message: input.message,
    },
  });

  // Email is best effort; the inquiry is already safely stored.
  const notify = process.env.ADMIN_NOTIFY_EMAIL || contactEmail;
  // At most a few acknowledgements per address per day, so the form can't be used to flood someone's inbox.
  const ackLimit = await rateLimit(`inquiry-ack:${hmac(input.email)}`, 3, 86_400);
  if (ackLimit.ok) {
    const ack = inquiryAcknowledgement(input, "Shabari");
    await sendEmail({ template: "inquiry-ack", to: input.email, inquiryId: inquiry.id, ...ack });
  }
  const note = adminNotification(input, `${siteUrl}/admin/inquiries`);
  await sendEmail({ template: "inquiry-admin", to: notify, replyTo: input.email, inquiryId: inquiry.id, ...note });

  return { status: "ok", message: "Thanks, your message was sent. I’ll get back to you as soon as I can." };
}
