import { Suspense } from "react";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicNav } from "@/components/public/public-nav";
import { AccountLink } from "@/components/site/account-link";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="public flex min-h-full flex-1 flex-col">
      <PublicNav
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
