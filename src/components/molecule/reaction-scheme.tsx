import { MOLECULES, roles } from "@/lib/molecules/analyze";
import { Skeletal } from "./skeletal";

// Dopamine biosynthesis. Structures are PubChem depictions; enzyme names and
// cofactors are standard biochemistry (tyrosine hydroxylase is rate-limiting).

const levodopaNewOH = roles(MOLECULES.levodopa).addedByTyrosineHydroxylase;

export function ReactionScheme({ step = 3, tone = "light" }: { step?: 1 | 2 | 3; tone?: "light" | "dark" }) {
  const ink = tone === "dark" ? "#E4E1F4" : "#0B1F44";
  const muted = tone === "dark" ? "text-[#B9B4D6]" : "text-[#4A5164]";
  const shown = (n: number) => (step >= n ? "opacity-100" : "opacity-0");
  return (
    <figure className="w-full">
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1 sm:gap-2">
        <Molecule name="L-tyrosine" className={shown(1)}>
          <Skeletal sideChainUp molecule={MOLECULES.tyrosine} title="Skeletal structure of L-tyrosine" ink={ink} className="w-full" />
        </Molecule>
        <Arrow enzyme="Tyrosine hydroxylase" cofactor="O₂, Fe²⁺, BH₄" className={shown(2)} muted={muted} ink={ink} />
        <Molecule name="L-DOPA" className={shown(2)}>
          <Skeletal sideChainUp molecule={MOLECULES.levodopa} title="Skeletal structure of L-DOPA, with the hydroxyl added by tyrosine hydroxylase highlighted" ink={ink} highlight={levodopaNewOH} className="w-full" />
        </Molecule>
        <Arrow enzyme="AADC" cofactor="PLP (vitamin B₆), releases CO₂" className={shown(3)} muted={muted} ink={ink} />
        <Molecule name="Dopamine" className={shown(3)}>
          <Skeletal sideChainUp molecule={MOLECULES.dopamine} title="Skeletal structure of dopamine" ink={ink} className="w-full" />
        </Molecule>
      </div>
      <figcaption className={`mt-4 text-sm ${muted}`}>Structures from PubChem.</figcaption>
    </figure>
  );
}

function Molecule({ name, className, children }: { name: string; className: string; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col items-center transition-opacity duration-500 ${className}`}>
      {children}
      <p className="mt-1 text-center text-sm font-semibold">{name}</p>
    </div>
  );
}

function Arrow({ enzyme, cofactor, className, muted, ink }: { enzyme: string; cofactor: string; className: string; muted: string; ink: string }) {
  return (
    <div className={`flex w-16 flex-col items-center text-center transition-opacity duration-500 sm:w-24 ${className}`}>
      <p className="text-[0.7rem] font-semibold leading-tight sm:text-xs">{enzyme}</p>
      <svg viewBox="0 0 80 12" className="my-1 w-full" aria-hidden>
        <line x1="2" y1="6" x2="72" y2="6" stroke={ink} strokeWidth="1.6" />
        <path d="M70 1 L78 6 L70 11 Z" fill={ink} />
      </svg>
      <p className={`text-[0.65rem] leading-tight sm:text-[0.7rem] ${muted}`}>{cofactor}</p>
    </div>
  );
}
