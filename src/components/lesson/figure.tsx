import { MesolimbicPathway } from "@/components/molecule/mesolimbic-pathway";
import { ReactionScheme } from "@/components/molecule/reaction-scheme";
import { Skeletal } from "@/components/molecule/skeletal";
import { MOLECULES, roles } from "@/lib/molecules/analyze";

const dopamine = MOLECULES.dopamine;

/** Named figures a lesson step can show. Unknown names render nothing. */
export function LessonFigure({ name }: { name: string | null }) {
  if (name === "dopamine-ring") {
    const r = roles(dopamine);
    return (
      <figure className="rounded-[3px] bg-[#F6F8F7] p-6">
        <Skeletal
          molecule={dopamine}
          title="Skeletal structure of dopamine with the amine highlighted"
          highlight={r.amine}
          highlightColor="#176A67"
          className="mx-auto w-full max-w-xs"
        />
        <figcaption className="mt-3 text-sm text-quiet">Dopamine. The amine (highlighted) is the group that picks up a proton. Structure from PubChem (CID 681).</figcaption>
      </figure>
    );
  }
  if (name === "synthesis") {
    return (
      <div className="rounded-[3px] bg-[#F6F8F7] p-6">
        <ReactionScheme step={3} />
      </div>
    );
  }
  if (name === "pathway") {
    return (
      <div className="rounded-[3px] bg-[#F6F8F7] p-6">
        <MesolimbicPathway className="w-full" />
      </div>
    );
  }
  return null;
}
