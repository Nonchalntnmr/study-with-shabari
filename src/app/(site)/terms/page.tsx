import type { Metadata } from "next";
import { Prose } from "@/components/site/prose";
import { Container, PageIntro } from "@/components/site/section";
import { AAMC_DISCLAIMER, contactEmail, founder } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <>
      <PageIntro eyebrow="Legal" title="Terms of service">
        Effective October 29, 2026.
      </PageIntro>
      <Container className="max-w-3xl py-14">
        <Prose>
          <p>By using studywithshabari.com you agree to these terms. If you don’t agree, please don’t use the site.</p>
          <h2>The free material</h2>
          <p>
            Notes and practice questions on this site are original work by {founder.name} and are free for your personal study. Please don’t
            republish, sell or bulk-copy them.
          </p>
          <h2>No affiliation, no guarantees</h2>
          <p>{AAMC_DISCLAIMER}</p>
          <p>
            Tutoring, practice and application help can’t guarantee any MCAT score or admissions outcome, and nothing on this site promises
            one.
          </p>
          <h2>Accounts</h2>
          <p>
            Keep your password private. You’re responsible for activity on your account. Accounts used to disrupt the site, scrape content or
            attack other users may be closed.
          </p>
          <h2>Tutoring and consulting</h2>
          <p>
            Paid services are arranged directly with {founder.shortName} after a free consultation. What’s included, the schedule and the price
            are agreed before any payment, which is made by Zelle. This site doesn’t take card payments or store bank details.
          </p>
          <h2>Availability</h2>
          <p>
            The site is provided as is. It may occasionally be unavailable or change, and practice content may be corrected or updated.
          </p>
          <h2>Limitation of liability</h2>
          <p>To the extent the law allows, {founder.name} isn’t liable for indirect or consequential losses from using the site.</p>
          <h2>Contact</h2>
          <p>
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
        </Prose>
      </Container>
    </>
  );
}
