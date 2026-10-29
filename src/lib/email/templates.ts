// Plain-text email bodies. Pure functions so they are easy to test, and plain
// text on purpose: user-supplied content never becomes HTML.

export type InquiryForEmail = {
  name: string;
  email: string;
  kind: string;
  testDate?: string | null;
  message: string;
};

/** Removes CR/LF so a value can never inject extra mail headers. */
export function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 200);
}

export function inquiryAcknowledgement(i: InquiryForEmail, signOff: string): { subject: string; text: string } {
  const first = headerSafe(i.name).split(" ")[0] || "there";
  return {
    subject: "Thanks for reaching out",
    text: [
      `Hi ${first},`,
      "",
      "Thanks for your message. It reached me and I'll get back to you as soon as I can.",
      "",
      // The message itself is deliberately not echoed: anyone can type any address into
      // the form, so echoing it would let strangers send their text from this domain.
      "If you didn't send a message through studywithshabari.com, you can ignore this email.",
      "",
      signOff,
    ].join("\n"),
  };
}

export function adminNotification(i: InquiryForEmail, adminUrl: string): { subject: string; text: string } {
  return {
    subject: `New ${i.kind.toLowerCase()} inquiry from ${headerSafe(i.name)}`,
    text: [
      `Name: ${headerSafe(i.name)}`,
      `Email: ${headerSafe(i.email)}`,
      `Topic: ${i.kind.toLowerCase()}`,
      i.testDate ? `Test date: ${headerSafe(i.testDate)}` : null,
      "",
      i.message,
      "",
      `Manage it: ${adminUrl}`,
    ]
      .filter((l): l is string => l !== null)
      .join("\n"),
  };
}
