"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { widgetHidden } from "@/lib/widget-pages";

// IONOS AI Chat Assistant (AI Frontdesk). Embed code per IONOS help:
// https://www.ionos.com/help/ai/ai-frontdesk/availability-and-publishing/ai-frontdesk-setting-up-and-integrating-the-website-widget/
// It only loads on domains allow-listed in AI Frontdesk, and only when an agent id is configured.
// The pages it never loads on (exam, lessons in progress, admin, account and auth pages) are listed
// in src/lib/widget-pages.ts, which also gives them a CSP without the widget's hosts.
const AGENT_ID = process.env.NEXT_PUBLIC_IONOS_CHAT_AGENT_ID;

// Once loaded, a third-party script keeps its DOM across client-side navigation.
let widgetLoaded = false;

export function ChatWidget() {
  const pathname = usePathname();
  const hidden = widgetHidden(pathname);
  // Navigating into the exam or an auth page from a page that loaded the widget: reload the
  // page so the widget is really gone there, rather than just not rendered again.
  useEffect(() => {
    if (hidden && widgetLoaded) window.location.reload();
  }, [hidden]);
  if (!AGENT_ID || hidden) return null;
  return (
    <Script
      id="ionos-ai-chat"
      src="https://ionos.ai-voicereceptionist.com/widget/v1/embed.js"
      data-agent-id={AGENT_ID}
      strategy="lazyOnload"
      onLoad={() => {
        widgetLoaded = true;
      }}
    />
  );
}
