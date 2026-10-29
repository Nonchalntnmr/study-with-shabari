import { Suspense } from "react";
import { PublicNav } from "@/components/public/public-nav";
import { AccountLink } from "./account-link";

/** App pages outside the public layout (results, dashboard, not found) use the same nav as the public site. */
export function SiteHeader() {
  return (
    <PublicNav
      className="public"
      account={
        <Suspense fallback={<span className="inline-block w-12" />}>
          <AccountLink />
        </Suspense>
      }
    />
  );
}
