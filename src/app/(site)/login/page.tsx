import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { Container } from "@/components/site/section";

export const metadata: Metadata = { title: "Sign in", robots: { index: false }, alternates: { canonical: "/login" } };

export default function Page() {
  return (
    <Container className="max-w-md py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-[-0.02em]">Welcome back.</h1>
      <p className="mt-2 text-muted-foreground">Sign in to see your practice history and progress.</p>
      <div className="mt-8 rounded-2xl border bg-white p-6 sm:p-7">
        <AuthForm mode="login" />
      </div>
    </Container>
  );
}
