// Schematic sagittal (midline, side) view of the brain's two main dopamine
// projections from the ventral tegmental area (VTA). Simplified on purpose:
// one stroke weight for outlines, a lighter one for internal landmarks.
// Front of the head is at left.
//
// Placement: the VTA is in the ventral midbrain (top of the brainstem, anterior
// side); the nucleus accumbens is anterior and ventral, below the front of the
// striatum; the mesocortical projection ends in the prefrontal cortex.

const OUTLINE = "#8C92A6";
const LANDMARK = "#BBC0CC";
const LEADER = "#8A90A4";

export function MesolimbicPathway({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <svg viewBox="0 0 680 440" role="img" aria-labelledby="mesolimbic-title mesolimbic-desc" className="w-full">
        <title id="mesolimbic-title">Dopamine pathways from the ventral tegmental area</title>
        <desc id="mesolimbic-desc">
          Simplified side view of the brain, front at left. Dopamine neurons in the ventral tegmental area of the midbrain project forward to the
          nucleus accumbens (the mesolimbic pathway) and to the prefrontal cortex (the mesocortical pathway).
        </desc>

        <g fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          {/* cerebral hemisphere, medial surface */}
          <path d="M96 236 C82 160 132 92 222 70 C300 50 410 54 482 94 C538 126 566 186 552 240 C546 262 528 274 504 274 C476 274 450 266 424 262 L404 262 C390 266 372 266 360 262 C344 270 322 276 300 272 C262 268 210 266 170 264 C132 262 104 256 96 236 Z" />
          {/* brainstem: midbrain, pons (anterior bulge), medulla */}
          <path d="M360 262 C352 286 342 300 344 322 C346 342 358 352 362 368 C366 384 366 402 366 420" />
          <path d="M404 262 C410 290 414 310 410 332 C406 352 404 368 404 386 C404 402 404 412 404 420" />
          {/* cerebellum */}
          <path d="M424 282 C456 268 512 276 532 304 C548 328 536 356 504 364 C474 372 440 360 428 340 C418 324 416 298 424 282 Z" />
        </g>

        <g fill="none" stroke={LANDMARK} strokeWidth="1.25" strokeLinecap="round">
          {/* corpus callosum */}
          <path d="M212 196 C252 152 352 144 424 180 C432 186 430 198 420 198 C356 172 266 176 228 208 C218 216 204 208 212 196 Z" />
          {/* cerebellar folia */}
          <path d="M438 300 C468 290 506 296 522 312" />
          <path d="M434 318 C462 310 500 314 520 328" />
          <path d="M440 336 C464 332 492 336 508 346" />
        </g>

        {/* mesocortical: VTA forward and up to the prefrontal cortex */}
        <path d="M370 276 C320 262 262 246 222 222 C190 204 160 186 142 172" fill="none" stroke="#1E7F7C" strokeWidth="3" strokeLinecap="round" />
        {/* mesolimbic: VTA forward to the nucleus accumbens */}
        <path d="M370 276 C330 274 270 258 222 242" fill="none" stroke="#D9577E" strokeWidth="3.5" strokeLinecap="round" />

        <circle cx="370" cy="276" r="8.5" fill="#D9577E" data-vta-dot />
        <circle cx="214" cy="240" r="9.5" fill="#EEF1EF" stroke="#D9577E" strokeWidth="3" />
        <circle cx="138" cy="168" r="8.5" fill="#EEF1EF" stroke="#1E7F7C" strokeWidth="3" />

        <g stroke={LEADER} strokeWidth="1">
          <line x1="136" y1="158" x2="128" y2="58" />
          <line x1="210" y1="251" x2="176" y2="340" />
          <line x1="378" y1="284" x2="452" y2="380" />
        </g>
        <g fontFamily="var(--font-schibsted), sans-serif">
          <text x="128" y="46" textAnchor="middle" fontSize="17" fontWeight="600" fill="#151A28">
            Prefrontal cortex
          </text>
          <text x="176" y="362" textAnchor="middle" fontSize="17" fontWeight="600" fill="#151A28">
            Nucleus accumbens
          </text>
          <text x="176" y="382" textAnchor="middle" fontSize="14" fill="#4A5164">
            ventral striatum
          </text>
          <text x="458" y="398" fontSize="17" fontWeight="600" fill="#151A28">
            Ventral tegmental area
          </text>
          <text x="458" y="418" fontSize="14" fill="#4A5164">
            dopamine neurons, midbrain
          </text>
        </g>
      </svg>
      <figcaption className="mt-5 grid gap-2 text-[0.95rem] text-specimen/85">
        <span className="flex items-center gap-3">
          <span aria-hidden className="h-[3px] w-7 rounded bg-eosin" />
          Mesolimbic pathway: reward, motivation, reinforcement
        </span>
        <span className="flex items-center gap-3">
          <span aria-hidden className="h-[3px] w-7 rounded bg-fixative" />
          Mesocortical pathway
        </span>
        <span className="text-sm text-quiet">Simplified side view, front of the head at left.</span>
      </figcaption>
    </figure>
  );
}
