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
              <strong>When you take a lesson:</strong> the answer you pick for each question, how sure you said you were, whether it was right,
              which common misconception it matched (if any) and the time you took. Like practice, it’s linked to your account or to the guest
              cookie.
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
            practice without one. Both are HTTP-only. Just reading pages sets no cookie at all; the guest cookie is set when you start a
            practice set or lesson. There are no advertising or cross-site tracking cookies, and no third-party analytics.
          </p>
          <h2>Visit counts</h2>
          <p>
            To see whether the free lesson and practice sets are useful, the site keeps a daily tally of a few events, such as “lesson
            started” and “lesson completed”. A tally is just a number per day: it has no cookie, account, IP address or anything else that
            could connect it to you. Days with fewer than five of an event aren’t shown even to the site’s admins.
          </p>
          <h2>Services that process data for the site</h2>
          <ul>
            <li>
              Vercel hosts the site. Like any web host it keeps its own short-lived request logs (the page address, browser type and IP
              address), for one hour to one day depending on the hosting plan. Supabase hosts the database and uploaded images.
            </li>
            <li>Fonts and images are served from this site, so reading a page doesn’t contact Google or any other outside service.</li>
            <li>IONOS provides the domains and, once set up, the email account used to reply to you.</li>
            <li>Calendly handles booking, and is loaded only on the booking page, under Calendly’s own privacy policy.</li>
            <li>If the on-site chat assistant is turned on, it is provided by IONOS, and conversations are handled under IONOS’s terms.</li>
            <li>If error monitoring is turned on, Sentry receives technical error reports.</li>
          </ul>
          <p>Your data is never sold or used for advertising.</p>
          <h2>How long it’s kept</h2>
          <ul>
            <li>Account, practice and lesson data are kept until you delete your account.</li>
            <li>Sign-in sessions end after 30 days and are then deleted. Password reset links expire after an hour.</li>
            <li>
              Guest practice and lesson history is deleted 180 days after it was started, which is when the guest cookie that links it to your
              browser expires.
            </li>
            <li>Contact messages are kept while they’re useful for answering you and following up.</li>
            <li>Rate-limit counters expire within a day.</li>
          </ul>
          <h2>Your choices</h2>
          <ul>
            <li>Download your data, or permanently delete your account and practice history, from Dashboard → Account.</li>
            <li>Guests can clear the practice and lesson history stored for their browser from the practice page.</li>
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
