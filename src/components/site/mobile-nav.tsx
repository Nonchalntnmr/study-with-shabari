"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mainNav } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col px-4">
          {[...mainNav, { href: "/faq", label: "FAQ" }, { href: "/contact", label: "Contact" }, { href: "/dashboard", label: "Dashboard" }].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="border-b py-3 text-base text-ink hover:text-blue">
              {item.label}
            </Link>
          ))}
          <Button asChild className="mt-6 h-11">
            <Link href="/book" onClick={() => setOpen(false)}>
              Book a free call
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
