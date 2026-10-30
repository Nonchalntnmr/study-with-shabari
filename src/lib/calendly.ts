/**
 * Only embed a booking link that really is a Calendly page over https. The
 * value comes from an environment variable, but a typo or a bad paste should
 * degrade to the email fallback instead of framing an arbitrary site.
 */
export function safeCalendlyUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "calendly.com" && url.hostname !== "www.calendly.com") return null;
    if (url.pathname.length < 2) return null;
    // www.calendly.com redirects to calendly.com, the only origin the CSP lets the page frame
    // and the only one the embed accepts booking messages from.
    url.hostname = "calendly.com";
    url.searchParams.set("hide_gdpr_banner", "1");
    return url.toString();
  } catch {
    return null;
  }
}
