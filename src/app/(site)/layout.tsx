import { Suspense } from "react";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicNav } from "@/components/public/public-nav";
import { AccountLink } from "@/components/site/account-link";
import { availableLinks } from "@/lib/availability";
import { nav } from "@/lib/founder-facts";
import { getAvailability } from "@/lib/public-data";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const availability = await getAvailability();
  return (
    <div className="public flex min-h-full flex-1 flex-col">
      <PublicNav
        links={availableLinks(nav, availability)}
        account={
          <Suspense fallback={<span className="inline-block w-12" />}>
            <AccountLink />
          </Suspense>
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
