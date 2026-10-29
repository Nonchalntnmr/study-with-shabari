// Sentry 11 collects cookies, headers and request bodies by default. Everything is
// switched off: session cookies, exam answers and contact messages must never leave.
export const sentryPrivacy = {
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [] as never[],
    urlQueryParams: false,
  },
};
