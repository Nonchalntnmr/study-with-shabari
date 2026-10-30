import { Suspense } from "react";
import { PublicNav } from "@/components/public/public-nav";
import { availableLinks } from "@/lib/availability";
import { nav } from "@/lib/founder-facts";
import { getAvailability } from "@/lib/public-data";
import { AccountLink } from "./account-link";

/** App pages outside the public layout (results, dashboard, not found) use the same nav as the public site. */
export async function SiteHeader() {
  const availability = await getAvailability();
  return (
    <PublicNav
      className="public"
      links={availableLinks(nav, availability)}
      account={
        <Suspense fallback={<span className="inline-block w-12" />}>
          <AccountLink />
        </Suspense>
      }
    />
  );
}
