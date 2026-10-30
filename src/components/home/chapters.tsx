"use client";

import { useSynthesisStep } from "@/components/cinema/story-scroll";
import { MesolimbicPathway } from "@/components/molecule/mesolimbic-pathway";
import { ReactionScheme } from "@/components/molecule/reaction-scheme";
import { Skeletal } from "@/components/molecule/skeletal";
import { MOLECULES, keyBondLengths, roles } from "@/lib/molecules/analyze";

const dopamine = MOLECULES.dopamine;
const measures = keyBondLengths(dopamine);
const r = roles(dopamine);

function Panel({ id, section, title, wide = false, children }: { id: "a" | "b" | "c"; section: string; title: [string, string]; wide?: boolean; children: React.ReactNode }) {
  return (
    <section data-chapter={id} aria-labelledby={`chapter-${id}`} className="chapter relative z-10">
      <div className="chapter-pin mx-auto w-full max-w-[1400px] px-5 sm:px-8">
        <div className={`panel w-full rounded-[3px] bg-mist p-7 sm:p-10 ${wide ? "md:w-[54%] md:max-w-[700px]" : "md:w-[44%] md:max-w-[560px]"}`}>
          <p className="text-[0.95rem] font-medium text-fixative-ink">{section}</p>
          <h2 id={`chapter-${id}`} className="mt-3 text-[clamp(2.4rem,4.4vw,3.75rem)]">
            <span className="block">{title[0]}</span>
            <span className="block">{title[1]}</span>
          </h2>
          <div className="mt-6 space-y-4 text-[1.0625rem] leading-relaxed text-specimen/90">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function Chapters() {
  const step = useSynthesisStep();
  return (
    <>
      <Panel id="a" section="Chemical and Physical Foundations" title={["Read it as", "a chemist."]}>
        <p>
          Dopamine is a catechol: a benzene ring carrying two neighbouring hydroxyl groups, with an ethylamine side chain. The ring is aromatic, flat
          with six delocalised π electrons, so its six carbon–carbon bonds come out essentially the same length, between a single and a double bond.
          At physiological pH the amine is protonated, so dopamine carries a positive charge.
        </p>
        <dl className="grid grid-cols-3 gap-3 border-t border-hairline pt-5">
          {measures.map((m) => (
            <div key={m.label}>
              <dt className="text-sm text-quiet">{m.label}</dt>
              <dd className="mt-1 font-display text-2xl text-hema">{m.angstrom.toFixed(3)} Å</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-quiet">Measured from PubChem’s computed 3D conformer of dopamine (CID 681).</p>
        <div className="only-static">
          <Skeletal
            molecule={dopamine}
            title="Skeletal structure of dopamine with the aromatic ring and amine highlighted"
            highlight={[...r.ring, ...r.amine]}
            highlightColor="#176A67"
            annotations={measures.map((m) => ({ atoms: m.atoms, text: `${m.angstrom.toFixed(3)} Å` }))}
            className="mx-auto mt-2 w-full max-w-sm"
          />
        </div>
      </Panel>

      <Panel id="b" section="Biological and Biochemical Foundations" title={["Read it as", "a biochemist."]} wide>
        <p>
          Neurons build dopamine from the amino acid tyrosine in two steps. Tyrosine hydroxylase adds a second hydroxyl group to the ring, giving
          L-DOPA, and it is the rate-limiting step. Aromatic L-amino acid decarboxylase then removes the carboxyl group as carbon dioxide.
        </p>
        <div className="pt-2">
          <ReactionScheme step={step} />
        </div>
      </Panel>

      <Panel id="c" section="Psychological, Social, and Biological Foundations of Behavior" title={["Read it as", "a psychologist."]}>
        <p>
          Dopamine neurons in the ventral tegmental area project to the nucleus accumbens. This mesolimbic pathway is central to reward, motivation and
          reinforcement learning, and many addictive drugs raise dopamine there. A second projection, the mesocortical pathway, reaches the
          prefrontal cortex.
        </p>
        <p>The same molecule turns up in all three science sections.</p>
        <div className="only-static">
          <MesolimbicPathway className="mt-2 w-full" />
        </div>
      </Panel>
    </>
  );
}
