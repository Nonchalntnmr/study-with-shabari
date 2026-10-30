"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { type ExplorerConfig, regionById } from "@/lib/explore/types";
import { cn } from "@/lib/utils";
import { useExplorerCaps } from "./capabilities";
import { createExplorerStore } from "./explorer-store";

const ExplorerScene = dynamic(() => import("./explorer-scene"), { ssr: false });

export function ModelExplorer({ config, credit }: { config: ExplorerConfig; credit: string }) {
  const caps = useExplorerCaps();
  const [store] = useState(() =>
    createExplorerStore({
      selected: null,
      hovered: null,
      layer: config.defaultLayer,
      resets: 0,
    })
  );
  const st = useSyncExternalStore(store.subscribe, store.get, store.get);
  const [armed, setArmed] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<"load" | "lost" | null>(null);

  // Lazy-load the 3D scene after load + idle on desktop so first paint is never delayed.
  useEffect(() => {
    if (!caps.live || caps.coarse) return;
    let idle = 0;
    let timer = 0;
    const arm = () => {
      if (window.requestIdleCallback) idle = window.requestIdleCallback(() => setArmed(true), { timeout: 1200 });
      else timer = window.setTimeout(() => setArmed(true), 180);
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    return () => {
      window.removeEventListener("load", arm);
      if (idle) window.cancelIdleCallback?.(idle);
      clearTimeout(timer);
    };
  }, [caps.live, caps.coarse]);

  const show3D = caps.live && !failed && (caps.coarse ? touchOpen : armed);
  const currentLayer = config.layers.find((l) => l.id === st.layer) ?? config.layers[0];
  const selectedRegion = regionById(config, st.selected);
  const hoveredRegion = regionById(config, st.hovered);

  function selectRegion(id: string | null) {
    if (!id) {
      store.set({ selected: null, hovered: null });
      return;
    }
    const r = regionById(config, id);
    if (!r) return;
    store.set({ selected: r.id, layer: r.layer, hovered: null });
  }

  return (
    <div className="space-y-10" data-explorer={config.id}>
      {/* Layer switcher + camera controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
        <div role="group" aria-label={`${config.modelName} layers`} className="flex flex-wrap gap-2">
          {config.layers.map((layer) => {
            const active = st.layer === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                aria-pressed={active}
                onClick={() => store.set({ layer: layer.id })}
                className={cn(
                  "rounded-full border px-4 py-2 text-[0.95rem] font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin",
                  active
                    ? "border-hema bg-hema text-white"
                    : "border-hairline bg-white text-hema hover:border-hema/40"
                )}
              >
                {layer.label}
              </button>
            );
          })}
        </div>

        {show3D && (
          <div role="group" aria-label={`${config.modelName} camera controls`} className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-label="Rotate left"
              onClick={() => store.send({ type: "rotate", azimuth: -0.35, polar: 0 })}
              className="grid size-9 place-items-center rounded-full border border-hairline bg-white text-hema hover:border-hema/50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
            >
              <span aria-hidden>←</span>
            </button>
            <button
              type="button"
              aria-label="Rotate right"
              onClick={() => store.send({ type: "rotate", azimuth: 0.35, polar: 0 })}
              className="grid size-9 place-items-center rounded-full border border-hairline bg-white text-hema hover:border-hema/50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
            >
              <span aria-hidden>→</span>
            </button>
            <button
              type="button"
              aria-label="Tilt up"
              onClick={() => store.send({ type: "rotate", azimuth: 0, polar: -0.25 })}
              className="grid size-9 place-items-center rounded-full border border-hairline bg-white text-hema hover:border-hema/50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
            >
              <span aria-hidden>↑</span>
            </button>
            <button
              type="button"
              aria-label="Tilt down"
              onClick={() => store.send({ type: "rotate", azimuth: 0, polar: 0.25 })}
              className="grid size-9 place-items-center rounded-full border border-hairline bg-white text-hema hover:border-hema/50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
            >
              <span aria-hidden>↓</span>
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => store.send({ type: "zoom", factor: 0.82 })}
              className="grid size-9 place-items-center rounded-full border border-hairline bg-white text-hema hover:border-hema/50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
            >
              <span aria-hidden>+</span>
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => store.send({ type: "zoom", factor: 1.22 })}
              className="grid size-9 place-items-center rounded-full border border-hairline bg-white text-hema hover:border-hema/50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
            >
              <span aria-hidden>−</span>
            </button>
            <button
              type="button"
              onClick={() => {
                store.set({ selected: null, hovered: null, resets: st.resets + 1 });
                store.send({ type: "reset" });
              }}
              className="ml-1 h-9 rounded-full border border-hairline bg-white px-3.5 text-[0.9rem] font-semibold text-hema hover:border-hema/50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
            >
              Reset view
            </button>
          </div>
        )}
      </div>

      {/* Main grid: 3D viewer + Details card on the left/top, accessible region list on the right/bottom */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] lg:gap-12">
        <div className="min-w-0 space-y-6">
          <div
            role="region"
            aria-label={`${config.modelName} viewer`}
            data-explorer-stage={config.id}
            data-explorer-mode={show3D && ready ? "live" : "still"}
            data-explorer-ready={show3D && ready ? "true" : "false"}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-hairline bg-[#FBF9F4]"
          >
            {/* Fallback still: visible until the 3D scene is ready, or permanently when WebGL is off */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center p-4 transition-opacity duration-300",
                show3D && ready ? "pointer-events-none opacity-0" : "opacity-100"
              )}
            >
              <Image
                src={currentLayer.still.src}
                alt={currentLayer.still.alt}
                width={640}
                height={480}
                priority
                className="max-h-full w-auto rounded-xl object-contain"
                data-testid={`${config.id}-still`}
              />
              {caps.live && caps.coarse && !touchOpen && !failed && (
                <button
                  type="button"
                  onClick={() => setTouchOpen(true)}
                  className="mt-3 rounded-full bg-hema px-5 py-2.5 text-[0.95rem] font-semibold text-white shadow-sm hover:bg-eosin focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
                >
                  Explore in 3D
                </button>
              )}
              {failed && (
                <button
                  type="button"
                  onClick={() => {
                    setFailed(null);
                    setReady(false);
                    setArmed(true);
                    setTouchOpen(true);
                  }}
                  className="mt-3 rounded-full border border-hema bg-white px-4 py-2 text-[0.9rem] font-semibold text-hema"
                >
                  Reload 3D view
                </button>
              )}
            </div>

            {show3D && (
              <div className={cn("absolute inset-0 transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}>
                <ExplorerScene
                  config={config}
                  store={store}
                  tier={caps.tier}
                  dprCap={caps.dprCap}
                  reducedMotion={caps.reducedMotion}
                  onReady={() => setReady(true)}
                  onFail={(why) => {
                    setReady(false);
                    setFailed(why);
                  }}
                />
                {/* Floating canvas labels positioned by ExplorerScene */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                  <div
                    ref={(el) => {
                      Object.assign(store.labels, { selected: el });
                    }}
                    style={{ opacity: 0 }}
                    className="absolute left-0 top-0 whitespace-nowrap rounded-full bg-hema px-3 py-1 text-[0.82rem] font-semibold text-white shadow-sm"
                  >
                    {selectedRegion?.name ?? ""}
                  </div>
                  <div
                    ref={(el) => {
                      Object.assign(store.labels, { hovered: el });
                    }}
                    style={{ opacity: 0 }}
                    className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-hairline bg-white px-2.5 py-0.5 text-[0.8rem] font-semibold text-hema shadow-sm"
                  >
                    {hoveredRegion?.name ?? ""}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Details panel for the selected structure */}
          <div
            role="status"
            aria-live="polite"
            data-testid="explorer-details"
            className="rounded-2xl border border-hairline bg-white p-6 sm:p-8"
          >
            {selectedRegion ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="inline-block size-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedRegion.color }}
                    />
                    <h2 className="font-display text-[1.75rem] leading-tight text-hema" data-testid="selected-region-name">
                      {selectedRegion.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectRegion(null)}
                    className="text-[0.9rem] font-semibold text-quiet underline decoration-hairline underline-offset-4 hover:text-hema focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
                  >
                    Show all structures
                  </button>
                </div>

                {selectedRegion.side && (
                  <p className="text-[0.92rem] font-medium text-quiet">{selectedRegion.side}</p>
                )}

                {selectedRegion.approximate && (
                  <p
                    data-testid="selected-region-approximate"
                    className="rounded-xl border border-hairline bg-mist px-4 py-3 text-[0.94rem] leading-relaxed text-specimen"
                  >
                    <span className="font-semibold text-hema">Approximate boundary: </span>
                    {selectedRegion.approximate}
                  </p>
                )}

                <div className="space-y-2.5 text-[1.05rem] leading-relaxed text-specimen">
                  {selectedRegion.note.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>

                {selectedRegion.lesson && selectedRegion.lesson.length > 0 && (
                  <div className="space-y-2 border-t border-hairline pt-4">
                    <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-quiet">
                      From Shabari’s dopamine lesson
                    </p>
                    <ul className="space-y-2 text-[0.98rem] leading-relaxed text-specimen">
                      {selectedRegion.lesson.map((line, i) => (
                        <li key={i} className="border-l-2 border-hema pl-3">
                          {line}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/dopamine"
                      className="inline-block pt-1 text-[0.92rem] font-semibold text-hema underline decoration-hema/30 underline-offset-4 hover:decoration-eosin"
                    >
                      Read the full dopamine lesson
                    </Link>
                  </div>
                )}

                {selectedRegion.related && selectedRegion.related.length > 0 && (
                  <div className="border-t border-hairline pt-4">
                    <p className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-quiet">
                      Related structures
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {selectedRegion.related.map((relId) => {
                        const rel = regionById(config, relId);
                        if (!rel) return null;
                        return (
                          <button
                            key={rel.id}
                            type="button"
                            onClick={() => selectRegion(rel.id)}
                            className="rounded-full border border-hairline bg-mist px-3.5 py-1.5 text-[0.9rem] font-semibold text-hema hover:border-hema/40 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
                          >
                            {rel.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="font-display text-[1.5rem] text-hema">Select a structure</h2>
                <p className="text-[1.02rem] leading-relaxed text-quiet">
                  Choose any structure from the list{show3D ? " or click directly on the 3D model" : ""} to see its function and MCAT connections.
                </p>
              </div>
            )}
          </div>

          {/* Same-page attribution required by Allen Citation Policy and CC BY 4.0 */}
          <p className="text-[0.88rem] leading-relaxed text-quiet" data-testid="explorer-credit">
            {credit}{" "}
            <Link
              href="/credits"
              className="font-semibold text-hema underline decoration-hema/30 underline-offset-4 hover:decoration-eosin focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin"
            >
              Full model attribution and modifications
            </Link>
            .
          </p>
        </div>

        {/* Accessible grouped structure list */}
        <nav aria-label={`${config.modelName} structures`} className="space-y-6 rounded-2xl border border-hairline bg-mist p-5 sm:p-7">
          {config.groups.map((grp) => {
            const grpRegions = config.regions.filter((r) => r.group === grp.id);
            return (
              <div key={grp.id}>
                <h3 className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-quiet">{grp.label}</h3>
                <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {grpRegions.map((r) => {
                    const isSelected = st.selected === r.id;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          data-region-button={r.id}
                          onClick={() => selectRegion(isSelected ? null : r.id)}
                          onMouseEnter={() => store.set({ hovered: r.id })}
                          onMouseLeave={() => {
                            if (store.get().hovered === r.id) store.set({ hovered: null });
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[0.98rem] font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-eosin",
                            isSelected
                              ? "border-hema bg-hema text-white"
                              : "border-hairline bg-white text-hema hover:border-hema/40"
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              aria-hidden
                              className="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                              style={{ backgroundColor: r.color }}
                            />
                            <span>{r.name}</span>
                          </span>
                          {r.approximate && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-medium",
                                isSelected ? "bg-white/20 text-white" : "bg-mist text-quiet"
                              )}
                            >
                              approx.
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
