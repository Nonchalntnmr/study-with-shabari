"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, type AuthState } from "@/lib/auth/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signIn : signUp, null);
  // Read after hydration instead of from the server, so the page stays static and the form is never replaced mid-typing.
  const [next, setNext] = useState<string | undefined>();
  useEffect(() => setNext(new URLSearchParams(window.location.search).get("next") ?? undefined), []);
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Name (optional)</Label>
          <Input id="name" name="name" autoComplete="name" maxLength={100} defaultValue={state?.fields?.name} className="h-10" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state?.fields?.email} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : undefined}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-describedby={mode === "signup" ? "pw-hint" : undefined}
          className="h-10"
        />
        {mode === "signup" && (
          <p id="pw-hint" className="text-xs text-muted-foreground">
            At least {PASSWORD_MIN_LENGTH} characters. A short phrase works well.
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="h-11 w-full text-sm">
        {pending ? "One moment…" : mode === "login" ? "Sign in" : "Create free account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href={`/signup${qs}`} className="font-medium text-blue hover:underline">
              Create a free account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={`/login${qs}`} className="font-medium text-blue hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
