"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-24">
      <h1 className="text-3xl font-semibold">Something went wrong.</h1>
      <p className="mt-3 text-muted-foreground">Please try again. If it keeps happening, email us and mention what you were doing.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <Button onClick={reset} className="mt-6 w-fit">
        Try again
      </Button>
    </main>
  );
}
