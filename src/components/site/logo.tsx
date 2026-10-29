import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 font-semibold tracking-tight text-navy ${className}`} aria-label="Study with Shabari, home">
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-navy text-[0.8rem] font-bold text-white">
        S
      </span>
      <span className="text-[0.95rem]">
        Study with <span className="hl">Shabari</span>
      </span>
    </Link>
  );
}
