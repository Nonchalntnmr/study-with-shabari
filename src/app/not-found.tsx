import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getAvailability } from "@/lib/public-data";

export default async function NotFound() {
  const { practice } = await getAvailability();
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center px-6 py-24">
        <p className="text-sm font-semibold text-blue">404</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em]">This page doesn’t exist.</h1>
        <p className="mt-3 text-muted-foreground">The link may be old, or the page may have moved.</p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
          {practice ? (
            <Button asChild variant="outline">
              <Link href="/practice">Practice sets</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/mcat">MCAT tutoring</Link>
            </Button>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
