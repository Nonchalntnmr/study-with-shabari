import type { Metadata } from "next";
import Link from "next/link";
import { BookingBand } from "@/components/b/booking-band";
import { Band, H2, Kicker, Lead, Wrap } from "@/components/b/primitives";
import brainAssets from "@/lib/explore/brain-assets.json";

export const metadata: Metadata = {
  title: "3D Model Credits & Attribution",
  description: "Open-access scientific 3D reference organ attributions, licenses, checksums, and modification logs.",
  alternates: { canonical: "/credits" },
};

const BRAIN_CHANGES = [
  "Converted from the HRA brain-male v1.3 GLB (Allen Human Reference Atlas 3D meshes).",
  "Corrected eight swapped mesh names per hemisphere (checked against the Allen voxel atlas by centroid and volume).",
  "Mirrored left-right and rotated about 18 degrees so the left hemisphere is on the subject's left, superior is +Y and anterior is +Z; recentred; units stay metres.",
  "Grouped atlas structures into display regions (one mesh per region and side; brainstem parts and corpus callosum join both sides).",
  "Split the superior temporal gyrus at the anterior edge of Heschl's gyrus (the posterior part plus the planum temporale approximates Wernicke's area).",
  "Dropped internal structures (white matter, ventricles, tracts, small nuclei) and the Visible Human optic chiasm.",
  "Simplified (meshoptimizer), removed normals (recomputed in the browser), quantized positions (KHR_mesh_quantization) and recoloured.",
];

export default function CreditsPage() {
  return (
    <div>
      <section aria-labelledby="credits-h" className="bg-white pb-12 pt-10 sm:pb-16 sm:pt-16">
        <Wrap>
          <Kicker>Open-Access Scientific Models</Kicker>
          <h1 id="credits-h" className="mt-4 max-w-2xl text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.04]">
            3D Model Credits &amp; Attribution
          </h1>
          <Lead className="mt-5 max-w-2xl">
            Our interactive 3D explorers adapt open-access reference organs released under Creative Commons Attribution 4.0 International (CC BY 4.0).
          </Lead>
        </Wrap>
      </section>

      <Band tone="mist" id="brain-credit" labelledBy="brain-credit-h">
        <div className="max-w-3xl space-y-6">
          <Kicker>Used on /explore/brain</Kicker>
          <H2 id="brain-credit-h">3D Reference Organ for Brain, Male (v1.3)</H2>
          <p className="text-[1.0625rem] leading-relaxed text-specimen">
            Adapted from the{" "}
            <strong className="font-semibold text-hema">HuBMAP 3D Reference Organ for Brain, Male v1.3</strong>{" "}
            (Kristen Browne and Heidi Schlehlein, 2023; licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-hema underline decoration-hema/30 underline-offset-4 hover:decoration-eosin"
            >
              CC BY 4.0
            </a>
            ), which is derived from the{" "}
            <strong className="font-semibold text-hema">Allen Human Reference Atlas – 3D, 2020 (RRID:SCR_017764)</strong>,{" "}
            © 2019 Allen Institute for Brain Science (Song-Lin Ding et al., licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-hema underline decoration-hema/30 underline-offset-4 hover:decoration-eosin"
            >
              CC BY 4.0
            </a>
            ).
          </p>

          <dl className="grid gap-3 rounded-2xl border border-hairline bg-white p-6 text-[0.95rem] sm:grid-cols-[10rem_1fr]">
            <dt className="font-semibold text-hema">Source asset</dt>
            <dd className="break-all text-specimen">{brainAssets.source.url}</dd>
            <dt className="font-semibold text-hema">Source SHA-256</dt>
            <dd className="break-all font-mono text-[0.85rem] text-specimen">{brainAssets.source.sha256}</dd>
            <dt className="font-semibold text-hema">License</dt>
            <dd className="text-specimen">Creative Commons Attribution 4.0 International (CC BY 4.0)</dd>
            <dt className="font-semibold text-hema">Explorer page</dt>
            <dd>
              <Link href="/explore/brain" className="font-semibold text-hema underline decoration-hema/30 underline-offset-4 hover:decoration-eosin">
                /explore/brain
              </Link>
            </dd>
          </dl>

          <div>
            <h3 className="font-display text-[1.45rem] text-hema">Modifications made by Study with Shabari</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[1rem] leading-relaxed text-specimen">
              {BRAIN_CHANGES.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </Band>

      <BookingBand service="mcat" />
    </div>
  );
}
