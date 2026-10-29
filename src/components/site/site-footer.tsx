import { PublicFooter } from "@/components/public/public-footer";

/** App pages outside the public layout share the public footer. */
export function SiteFooter() {
  return (
    <div className="public">
      <PublicFooter />
    </div>
  );
}
