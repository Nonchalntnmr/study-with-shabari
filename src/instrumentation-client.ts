// Sentry, browser side. Loaded only when a DSN is configured, so it costs nothing otherwise.
import { sentryPrivacy } from "@/lib/sentry-options";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) =>
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      ...sentryPrivacy,
      // No session replay: it would record students' answers.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    }),
  );
}
