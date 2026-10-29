"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function PublicMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="rounded-full px-3.5 py-2 text-[0.9rem] font-medium text-hema ring-1 ring-hairline min-[1180px]:hidden" aria-label="Open menu">
        Menu
      </SheetTrigger>
      <SheetContent side="top" className="public border-b border-hairline bg-slide">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl font-normal text-hema">Study with Shabari</SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="grid gap-1 px-4 pb-8">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-hairline py-3 font-display text-2xl text-hema">
              {l.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
