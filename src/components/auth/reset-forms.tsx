"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword, type ResetState } from "@/lib/auth/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

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
  // The link carries the token in the fragment, which never reaches the server or hosting
  // logs. Read it once into memory, then strip it from the address bar and history so it
  // can't leak through a later screenshot, a shared URL or an error report of location.href.
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (!t) return;
    // The fragment only exists in the browser, so reading it has to happen after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(t);
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }, []);
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
