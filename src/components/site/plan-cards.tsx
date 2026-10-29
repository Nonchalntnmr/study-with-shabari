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
          className={cn("flex flex-col rounded-[24px] border border-hairline bg-slide p-8", plan.featured && "border-hema/50 bg-white ring-1 ring-hema/40")}
        >
          <h3 className="text-[1.75rem]">{plan.name}</h3>
          <p className="mt-4 font-display text-5xl text-hema">{plan.priceLabel}</p>
          {plan.detail && <p className="mt-1 text-sm text-muted-foreground">{plan.detail}</p>}
          <ul className="mt-6 flex-1 space-y-3 text-sm">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-1 size-4 shrink-0 text-fixative" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {plan.note && <p className="mt-5 text-xs text-muted-foreground">{plan.note}</p>}
          <Button
            asChild
            variant={plan.featured ? "default" : "outline"}
            className={cn("mt-8 h-12 rounded-full text-[0.95rem]", plan.featured ? "bg-eosin font-semibold text-specimen hover:bg-[#E46C91]" : "border-hema/30 bg-transparent text-hema")}
          >
            <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
          </Button>
        </article>
      ))}
    </div>
  );
}
