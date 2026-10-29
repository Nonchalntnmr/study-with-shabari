"use client";

import { useActionState, useState } from "react";
import { useSearchParam } from "@/lib/use-client-value";
import { submitInquiry } from "@/lib/inquiries/actions";
import { INQUIRY_KINDS, KIND_LABELS, initialInquiryState } from "@/lib/inquiries/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1 text-sm text-danger">
      {message}
    </p>
  ) : null;
}

export function ContactForm() {
  const [state, action, pending] = useActionState(submitInquiry, initialInquiryState);
  const topic = useSearchParam("topic")?.toUpperCase();
  const [chosen, setKind] = useState<string | null>(null);
  const kind = chosen ?? (topic && (INQUIRY_KINDS as readonly string[]).includes(topic) ? topic : "CONSULTATION");

  if (state.status === "ok") {
    return (
      <div role="status" className="rounded-xl border bg-success-soft p-6">
        <h2 className="text-lg font-semibold">Message sent</h2>
        <p className="mt-1 text-sm">{state.message}</p>
      </div>
    );
  }

  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm">
          {state.message}
        </p>
      )}

      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" autoComplete="name" required maxLength={100} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} className="mt-1.5" />
        <FieldError id="name-err" message={errors.name} />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} className="mt-1.5" />
        <FieldError id="email-err" message={errors.email} />
      </div>

      <div>
        <Label htmlFor="kind">What’s this about?</Label>
        <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          {INQUIRY_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <FieldError id="kind-err" message={errors.kind} />
      </div>

      <div>
        <Label htmlFor="testDate">MCAT test date (optional)</Label>
        <Input id="testDate" name="testDate" placeholder="e.g. March 2027, or not scheduled yet" maxLength={60} className="mt-1.5" />
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={6} required maxLength={5000} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined} className="mt-1.5" />
        <FieldError id="message-err" message={errors.message} />
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
