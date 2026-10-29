import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPublishedPlans } from "@/lib/public-data";
import { cn } from "@/lib/utils";

export async function PlanCards() {
  const plans = await getPublishedPlans();
  if (plans.length === 0) return <p className="text-muted-foreground">Pricing is shared on the free consultation.</p>;
  return (
    <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
      {plans.map((plan) => (
        <article
          key={plan.slug}
          className={cn(
            "flex flex-col rounded-2xl border bg-white p-7",
            plan.featured && "border-navy shadow-[0_18px_40px_-20px_rgba(16,37,75,0.45)] ring-1 ring-navy lg:-my-3 lg:py-10",
          )}
        >
          {plan.featured && <p className="mb-3 w-fit rounded-full bg-sky px-2.5 py-1 text-xs font-semibold text-navy">Most complete</p>}
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-navy">{plan.priceLabel}</p>
          {plan.detail && <p className="mt-1 text-sm text-muted-foreground">{plan.detail}</p>}
          <ul className="mt-6 flex-1 space-y-3 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {plan.note && <p className="mt-5 text-xs text-muted-foreground">{plan.note}</p>}
          <Button asChild variant={plan.featured ? "default" : "outline"} className="mt-6 h-11 text-sm">
            <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
          </Button>
        </article>
      ))}
    </div>
  );
}
