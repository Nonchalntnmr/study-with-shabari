import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Container } from "@/components/site/section";

export const metadata: Metadata = { title: "Create an account", robots: { index: false }, alternates: { canonical: "/signup" } };

export default function Page() {
  return (
    <Container className="max-w-md py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">Create your free account.</h1>
      <p className="mt-2 text-muted-foreground">Save your practice history across devices and get a study plan from your results. Practice you did as a guest in this browser comes with you.</p>
      <div className="mt-8 rounded-2xl border bg-white p-6 sm:p-7">
        <AuthForm mode="signup" />
      </div>
    </Container>
  );
}
