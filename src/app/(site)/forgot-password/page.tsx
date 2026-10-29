import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/reset-forms";
import { Container } from "@/components/site/section";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function Page() {
  return (
    <Container className="max-w-md py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">Reset your password.</h1>
      <p className="mt-2 text-muted-foreground">Enter the email you signed up with.</p>
      <div className="mt-8 rounded-2xl border bg-white p-6 sm:p-7">
        <ForgotPasswordForm />
      </div>
    </Container>
  );
}
