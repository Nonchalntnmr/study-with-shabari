"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// IONOS AI Chat Assistant (AI Frontdesk). Embed code per IONOS help:
// https://www.ionos.com/help/ai/ai-frontdesk/availability-and-publishing/ai-frontdesk-setting-up-and-integrating-the-website-widget/
// It only loads on domains allow-listed in AI Frontdesk, and only when an agent id is configured.
// Kept off the exam, so it can't distract or help mid-test, and off admin and account pages.
const AGENT_ID = process.env.NEXT_PUBLIC_IONOS_CHAT_AGENT_ID;
const HIDDEN_PREFIXES = ["/exam", "/admin", "/dashboard", "/login", "/signup", "/account"];
// A lesson in progress is a focused answering surface, like the exam: no third-party widget on it.
const LESSON_ATTEMPT = /^\/lessons\/[^/]+\/a\//;

export function ChatWidget() {
  const pathname = usePathname();
  if (!AGENT_ID || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p)) || LESSON_ATTEMPT.test(pathname)) return null;
  return (
    <Script
      id="ionos-ai-chat"
      src="https://ionos.ai-voicereceptionist.com/widget/v1/embed.js"
      data-agent-id={AGENT_ID}
      strategy="lazyOnload"
    />
  );
}
