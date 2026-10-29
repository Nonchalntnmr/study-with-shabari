"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, deleteAccount, updateProfile, type AccountState } from "@/lib/auth/actions";

export function ProfileForm({ name, testDate }: { name: string; testDate: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={name} maxLength={100} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="targetTestDate">MCAT test date</Label>
        <Input id="targetTestDate" name="targetTestDate" type="date" defaultValue={testDate} className="h-10 w-48" />
        <p className="text-xs text-muted-foreground">Used only to pace your study plan.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.ok && <p role="status" className="text-sm text-success">{state.ok}</p>}
        {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(deleteAccount, null);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="del-password">Confirm with your password</Label>
        <Input id="del-password" name="password" type="password" required autoComplete="current-password" className="h-10 max-w-sm" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting…" : "Delete my account and data"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" required autoComplete="current-password" className="h-10 max-w-sm" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="next">New password</Label>
        <Input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" className="h-10 max-w-sm" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </Button>
        {state?.ok && <p role="status" className="text-sm text-success">{state.ok}</p>}
        {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      </div>
    </form>
  );
}
