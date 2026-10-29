import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-forms";
import { Container } from "@/components/site/section";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Page() {
  return (
    <Container className="max-w-md py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">Choose a new password.</h1>
      <p className="mt-2 text-muted-foreground">Reset links work once, for one hour. Setting a new password signs you out everywhere else.</p>
      <div className="mt-8 rounded-2xl border bg-white p-6 sm:p-7">
        <ResetPasswordForm />
      </div>
    </Container>
  );
}
