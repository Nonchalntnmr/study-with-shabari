import "server-only";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { headerSafe } from "./templates";

type Outgoing = {
  template: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  inquiryId?: string | null;
};

/**
 * Nothing leaves the building until MAIL_SENDER_VERIFIED is "true" and SMTP is
 * configured. Until then every message is stored with status NOT_CONFIGURED so
 * it is visible in the admin area and nothing is silently lost or half-sent.
 */
function transportConfig() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM, MAIL_SENDER_VERIFIED } = process.env;
  if (MAIL_SENDER_VERIFIED !== "true") return null;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !MAIL_FROM) return null;
  return { host: SMTP_HOST, port: Number(SMTP_PORT ?? 587), user: SMTP_USER, pass: SMTP_PASSWORD, from: MAIL_FROM };
}

/** Never throws: an email problem must not break the action that triggered it. */
export async function sendEmail(msg: Outgoing): Promise<"SENT" | "FAILED" | "NOT_CONFIGURED"> {
  const subject = headerSafe(msg.subject);
  const to = headerSafe(msg.to);
  const cfg = transportConfig();

  if (!cfg) {
    await db.emailMessage.create({
      data: { template: msg.template, to, subject, status: "NOT_CONFIGURED", inquiryId: msg.inquiryId ?? null },
    });
    return "NOT_CONFIGURED";
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    const info = await transporter.sendMail({
      from: cfg.from,
      to,
      subject,
      text: msg.text,
      replyTo: msg.replyTo ? headerSafe(msg.replyTo) : undefined,
    });
    await db.emailMessage.create({
      data: {
        template: msg.template,
        to,
        subject,
        status: "SENT",
        providerMessageId: typeof info.messageId === "string" ? info.messageId.slice(0, 200) : null,
        inquiryId: msg.inquiryId ?? null,
      },
    });
    return "SENT";
  } catch (error) {
    // Keep the reason, never the credentials or the message body.
    const reason = error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
    await db.emailMessage.create({
      data: { template: msg.template, to, subject, status: "FAILED", error: reason, inquiryId: msg.inquiryId ?? null },
    });
    return "FAILED";
  }
}
