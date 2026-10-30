# IONOS products: what they are and how the site uses them

Checked against IONOS's own help pages on 2026-10-29. Sources are at the end. "Verified" means an IONOS page says so. "Unknown" means IONOS doesn't document it.

## Summary

| Product | What it actually is | Used by the site? |
|---|---|---|
| **AI Chat Assistant** | A standalone AI Frontdesk add-on: a website chat widget embedded with one script tag. No API. | Yes, as an optional embed. Off until you add your agent ID. |
| **AI Email Assistant** | An AI Frontdesk add-on that sorts mail and drafts replies **for a mailbox you already have**. It is not a mailbox, gives no SMTP, and has no API. | No. The site needs a real mailbox for sending (see below). |
| **Instant Domain** | IONOS's domain-only contract: domain registration without webspace or hosting. | Indirectly. It's why the domains currently point at an IONOS parking page. Nothing to integrate. |

The four domains use IONOS nameservers. Today each serves an IONOS parking page over HTTP only, and HTTPS fails. `www` has no record.

## AI Chat Assistant (website widget)

**Verified:** IONOS's embed code is:

```html
<script src="https://ionos.ai-voicereceptionist.com/widget/v1/embed.js" data-agent-id="YOUR_AGENT_ID" defer></script>
```

- It works on any site on your own registered domain. It won't run on `*.live-website.com` system domains.
- It stays disabled until you list the site under **Allowed domains**. Entries are exact hosts (`www.example.com`), and `*.example.com` covers subdomains. IONOS doesn't say whether `www` also covers the bare domain, so add both `studywithshabari.com` and `www.studywithshabari.com`.
- Knowledge comes from training on the public website (a manual "Train" button), plus topics you write and uploaded files (PDF/DOCX/TXT/MD and similar, 10 MB and 15 pages each). **Retraining replaces extracted topics, including your manual edits to them.**
- Conversations are saved under "Conversations", and a summary is emailed after each chat. IONOS documents no analytics and no live human takeover. "Escalation" means transfer to a phone call, configured in AI Receptionist.
- No API for the chat. "API integrations" are documented only for AI Receptionist Unlimited.

**How the site uses it:** `src/components/site/chat-widget.tsx` loads exactly that script through `next/script`, and only when `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID` is set. It's kept off the exam (no help mid-test), admin, dashboard and sign-in pages. The site's Content-Security-Policy allows `ionos.ai-voicereceptionist.com` only when that variable is set, and the policy is fixed at build time, so redeploy after setting it. IONOS doesn't document what else the widget loads, so after enabling it, open the browser console on the live site. If you see CSP violations, add those hosts in `src/lib/csp.ts`.

**There is no fake chatbot.** Unless the IONOS widget is configured, the site has no chat at all.

**To turn it on (founder):**
1. IONOS → AI Frontdesk → AI Chat Assistant → Website widget: copy the agent ID.
2. Allowed domains: add `studywithshabari.com` and `www.studywithshabari.com`.
3. Knowledge: upload [`ionos-chat-knowledge.md`](./ionos-chat-knowledge.md) and paste its "Behavior rules" into the assistant's instructions. Those rules stop it from inventing guarantees, scores, testimonials or availability, and send uncertain questions to Shabari.
4. Vercel → Environment Variables: `NEXT_PUBLIC_IONOS_CHAT_AGENT_ID=<id>`, then redeploy.
5. Ask it the test questions at the bottom of the knowledge file before announcing it.

Privacy: IONOS's chat page doesn't mention GDPR. IONOS's own instructions suggest adding a cookie-consent entry for the widget. The site's privacy policy already names IONOS as the chat provider "if turned on".

## AI Email Assistant, and real email for the site

**Verified:** The AI Email Assistant connects to an existing mailbox (an IONOS mailbox, Microsoft 365, or any provider over IMAP/SMTP). It classifies mail and drafts or auto-sends replies, with approvals in the AI Frontdesk dashboard. It **does not include a mailbox**, gives the website no way to send, and has no API. "Webmail AI" is a different add-on that writes inside IONOS Webmail. Check which one was bought.

The site sends only transactional mail, and only after it's enabled: an acknowledgement to someone who used the contact form (capped at 3 per address per day, never echoing their message), and a notification to Shabari. Until a verified sender exists, every message is **stored but not sent**, with status `NOT_CONFIGURED`, and shown under Admin → Audit log.

**To enable `hello@studywithshabari.com` (founder; costs money, needs approval):**
1. Buy a mailbox. IONOS Mail Basic is the cheapest option documented to provide SMTP. The domain-only contract has no mailbox.
2. Create `hello@studywithshabari.com`. Send and receive one test message from IONOS Webmail.
3. DKIM: IONOS turns it on by default for domains on IONOS nameservers. `s1-ionos._domainkey` and `s2-ionos._domainkey` already resolve for studywithshabari.com.
4. In Vercel, set `SMTP_HOST=smtp.ionos.com`, `SMTP_PORT=587` (STARTTLS; 465 also works), `SMTP_USER=hello@studywithshabari.com`, `SMTP_PASSWORD=<mailbox password>`, `MAIL_FROM="Study with Shabari <hello@studywithshabari.com>"`, then **`MAIL_SENDER_VERIFIED=true`** last.
5. IONOS rejects a From address on a different domain (since 2024-01-29), so `MAIL_FROM` must be on studywithshabari.com.
6. Optional: connect the same mailbox to the AI Email Assistant to sort and draft replies to inquiries. That happens entirely inside IONOS.
7. Once replies work, set `NEXT_PUBLIC_CONTACT_EMAIL=hello@studywithshabari.com`. Until then the site shows jshankar@mit.edu.

DMARC is currently `p=none` (via a CNAME to `dmarc.ionos.com`). Leave it until mail has flowed cleanly for a few weeks.

## Instant Domain

**Verified:** IONOS lists it among "contract types that do not have webspace": registration and DNS only, with an upgrade path. IONOS publishes no feature page for it. Nothing in it publishes a website, so the parking page is just the default A record. It doesn't need cancelling: the domains live in it, and DNS editing works in it. **Don't cancel it, since that could release the domains.**

## DNS facts that matter for the cutover

- IONOS lets you edit A, AAAA, TXT and `www` CNAME records on a domain-only contract.
- IONOS's own Vercel guide says to remove or replace the parking A record, because only one A record may be active for the apex.
- Vercel doesn't serve custom domains over IPv6 on third-party DNS. **The IONOS AAAA records (`2607:f1c0:100f:f000::200`) must be deleted**, or IPv6 visitors keep landing on the parking page.
- IONOS domain forwarding claims https→https support, but its certificate behavior and redirect status code aren't documented. The site therefore doesn't use IONOS forwarding. All four domains point at Vercel, and the app issues the redirects.
- An IONOS DNS API exists (`https://api.hosting.ionos.com/dns/v1`, header `X-API-Key: prefix.secret`), but it must be enabled per account first. Not needed for a one-time cutover.

The exact cutover steps are in [DEPLOYMENT.md](./DEPLOYMENT.md#5-dns-cutover-founder-approval-required).

## Sources

- AI Chat Assistant: https://www.ionos.com/momentum/ai-chat-assistant
- Widget setup and allowed domains: https://www.ionos.com/help/ai/ai-frontdesk/availability-and-publishing/ai-frontdesk-setting-up-and-integrating-the-website-widget/
- Chat getting started: https://www.ionos.com/help/ai/ai-frontdesk/getting-started/getting-started-with-the-ai-chat-assistant/
- Chat knowledge: https://www.ionos.com/help/ai/ai-frontdesk/knowledge-and-behavior/ai-frontdesk-storing-and-managing-company-knowledge/
- AI Frontdesk overview: https://www.ionos.com/help/ai/ai-frontdesk/getting-started/ai-frontdesk-an-overview-of-products-channels-and-the-user-interface/
- AI Email Assistant: https://www.ionos.com/momentum/ai-email-assistant and https://www.ionos.com/help/ai/ai-frontdesk/getting-started/getting-started-with-the-ai-email-assistant/
- Webmail AI: https://www.ionos.com/help/email/using-webmail/adding-webmail-ai/
- SMTP settings: https://www.ionos.com/help/email/general-topics/ionos-mail-server-details-for-imap-pop3-and-smtp/
- DKIM: https://www.ionos.com/help/domains/configuring-mail-servers-and-other-related-records/email-authentication-with-dkim
- Domain-only contracts: https://www.ionos.com/help/domains/connecting-a-domain-to-your-webspace/check-contract-information-for-available-webspace/
- IONOS → Vercel: https://www.ionos.com/help/domains/connecting-a-domain-with-an-external-website/connecting-your-domain-to-vercel/
- Forwarding: https://www.ionos.com/help/domains/forwarding-a-domain/forwarding-a-domain-to-a-different-domain/
- DNS API: https://developer.hosting.ionos.com/docs/getstarted
- Vercel custom domains: https://vercel.com/docs/domains/set-up-custom-domain and https://vercel.com/kb/guide/a-record-and-caa-with-vercel
