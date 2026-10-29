import type { Metadata } from "next";
import { Prose } from "@/components/site/prose";
import { Container, PageIntro } from "@/components/site/section";
import { contactEmail, founder } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <>
      <PageIntro eyebrow="Legal" title="Privacy policy">
        Effective October 29, 2026. Plain language: what this site stores, why, and how to get it deleted.
      </PageIntro>
      <Container className="max-w-3xl py-14">
        <Prose>
          <p>
            Study with Shabari (“the site”) is run by {founder.name}. Questions about this policy go to{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
          <h2>What the site stores</h2>
          <ul>
            <li>
              <strong>If you create an account:</strong> your email address, an optional name, an optional MCAT test date, and a one-way hash
              of your password (never the password itself).
            </li>
            <li>
              <strong>When you practice:</strong> the answers you choose, choices you strike out, questions you flag, passage highlights, time
              per question and your results. Guests’ practice is linked to a random identifier in a cookie, not to a name or email.
            </li>
            <li>
              <strong>When you use the contact form:</strong> your name, email, topic, optional test date and message, plus a record of any
              automatic emails sent about it.
            </li>
            <li>
              <strong>Security records:</strong> a log of sensitive admin actions, and short-lived rate-limit counters keyed by a keyed hash of
              your IP address (the raw address isn’t stored).
            </li>
          </ul>
          <h2>Cookies</h2>
          <p>
            The site sets only the cookies it needs to work: a sign-in cookie if you have an account, and a guest cookie so you can resume
            practice without one. Both are HTTP-only. There are no advertising or cross-site tracking cookies, and no third-party analytics.
          </p>
          <h2>Services that process data for the site</h2>
          <ul>
            <li>Vercel hosts the site. Supabase hosts the database and uploaded images.</li>
            <li>IONOS provides the domains and, once set up, the email account used to reply to you.</li>
            <li>Calendly handles booking when you schedule a consultation, under Calendly’s own privacy policy.</li>
            <li>If the on-site chat assistant is turned on, it is provided by IONOS, and conversations are handled under IONOS’s terms.</li>
            <li>If error monitoring is turned on, Sentry receives technical error reports.</li>
          </ul>
          <p>Your data is never sold or used for advertising.</p>
          <h2>How long it’s kept</h2>
          <p>
            Account and practice data are kept until you delete your account. Contact messages are kept while they’re useful for answering
            you and following up. Rate-limit counters expire within a day.
          </p>
          <h2>Your choices</h2>
          <ul>
            <li>Download your data, or permanently delete your account and practice history, from Dashboard → Account.</li>
            <li>Guests can clear the practice history stored for their browser from the practice page.</li>
            <li>
              To have a contact message deleted, or for any other request, email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </li>
          </ul>
          <h2>Children</h2>
          <p>The site is meant for students preparing for the MCAT and isn’t directed at children under 13.</p>
          <h2>Changes</h2>
          <p>If this policy changes, the effective date above changes with it.</p>
        </Prose>
      </Container>
    </>
  );
}
