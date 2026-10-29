"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword, type ResetState } from "@/lib/auth/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";
import { useSearchParam } from "@/lib/use-client-value";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestPasswordReset, null);
  if (state?.ok) return <p role="status" className="rounded-lg bg-success-soft p-4 text-sm">{state.ok}</p>;
  return (
    <form action={action} className="space-y-5">
      {state?.error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm">{state.error}</p>}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email on your account</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" className="h-10" />
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? "One moment…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const token = useSearchParam("token");
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, null);
  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm">
          {state.error}{" "}
          <Link href="/forgot-password" className="font-medium text-blue hover:underline">
            Request a new link
          </Link>
        </p>
      )}
      <input type="hidden" name="token" value={token ?? ""} />
      <div className="space-y-1.5">
        <Label htmlFor="next">New password</Label>
        <Input id="next" name="next" type="password" required minLength={PASSWORD_MIN_LENGTH} autoComplete="new-password" className="h-10" />
        <p className="text-xs text-muted-foreground">At least {PASSWORD_MIN_LENGTH} characters.</p>
      </div>
      <Button type="submit" disabled={pending || !token} className="h-11 w-full">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
