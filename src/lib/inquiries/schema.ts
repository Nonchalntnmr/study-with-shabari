import { z } from "zod";

export const INQUIRY_KINDS = ["CONSULTATION", "TUTORING", "ADMISSIONS", "RESOURCES", "SUPPORT", "OTHER"] as const;

export const KIND_LABELS: Record<(typeof INQUIRY_KINDS)[number], string> = {
  CONSULTATION: "Free 15-minute consultation",
  TUTORING: "MCAT tutoring",
  ADMISSIONS: "Admissions advising",
  RESOURCES: "Notes and practice resources",
  SUPPORT: "Help with the practice platform",
  OTHER: "Something else",
};

const clean = (max: number) => z.string().trim().max(max);

export const inquirySchema = z.object({
  name: clean(100).min(1, "Please enter your name."),
  email: clean(254)
    .toLowerCase()
    .pipe(z.email("Please enter a valid email address.")),
  kind: z.enum(INQUIRY_KINDS, { error: "Choose what this is about." }),
  testDate: clean(60).optional().transform((v) => (v ? v : undefined)),
  message: clean(5000).min(10, "Please write at least a sentence or two."),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(200).optional(),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export type FieldErrors = Partial<Record<keyof InquiryInput, string>>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof InquiryInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export type InquiryResult =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string; errors?: FieldErrors };

// Lives here, not in actions.ts: a "use server" module may only export async functions.
export const initialInquiryState: InquiryResult = { status: "idle" };
