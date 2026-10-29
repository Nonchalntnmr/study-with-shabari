"use client";

import { useEffect } from "react";

// Last-resort boundary for errors in the root layout. Reports to Sentry when configured.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import("@sentry/nextjs").then((S) => S.captureException(error));
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", maxWidth: 560, margin: "0 auto", color: "#111827" }}>
        <h1 style={{ color: "#10254b" }}>Something went wrong.</h1>
        <p>The page hit an unexpected error. Your practice answers are saved as you go, so you can try again safely.</p>
        <button onClick={reset} style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, border: 0, background: "#10254b", color: "white", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
