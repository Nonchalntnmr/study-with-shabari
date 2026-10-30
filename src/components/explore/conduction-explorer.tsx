"use client";

import { useEffect, useRef, useState } from "react";
import { useStageMode } from "@/components/cinema/capabilities";
import { NODES, TRAVEL_S, conductionAt } from "@/lib/explore/action-potential";
import { NEW } from "@/lib/explore/signaling-copy";

// Myelin on or off, then send an action potential down the axon. Without myelin a front slides
// along the whole membrane; with myelin it is regenerated only at the nodes of Ranvier and jumps
// from node to node, arriving sooner. With reduced motion the run is shown as a still of where the
// impulse has been, with no animation.

const W = 420;
const H = 128;
const X0 = 22;
const X1 = 398;
const Y = 64;
const R = 13;
const nx = (f: number) => X0 + f * (X1 - X0);
const FONT = "var(--font-schibsted), ui-sans-serif, sans-serif";

function AxonFigure({ myelin, s, sent }: { myelin: boolean; s: number; sent: boolean }) {
  const { front, node, done } = conductionAt(s, myelin);
  const title = `${myelin ? "Myelinated" : "Unmyelinated"} axon${sent ? (done ? ": the action potential has reached the end" : ": an action potential on its way") : ""}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full" fontFamily={FONT} data-axon={myelin ? "myelinated" : "unmyelinated"} data-done={done && sent ? "true" : "false"}>
      <title>{title}</title>
      <defs>
        <linearGradient id="ap-front" x1="0" x2="1">
          <stop offset="0" stopColor="#1F5BFF" stopOpacity="0" />
          <stop offset="0.75" stopColor="#1F5BFF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#1F5BFF" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {/* the axon */}
      <rect x={X0 - 8} y={Y - R} width={X1 - X0 + 16} height={R * 2} rx={R} fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
      {/* unmyelinated: a front sliding along the membrane */}
      {!myelin && sent && (
        <rect x={Math.max(X0 - 8, nx(front) - 70)} y={Y - R + 2} width={Math.max(0, nx(front) - Math.max(X0 - 8, nx(front) - 70))} height={R * 2 - 4} rx={R - 2} fill="url(#ap-front)" data-front={front.toFixed(3)} />
      )}
      {/* myelin sheaths between the nodes */}
      {myelin &&
        NODES.slice(0, -1).map((f, i) => {
          const a = nx(f) + 5;
          const b = nx(NODES[i + 1]) - 5;
          return <rect key={i} x={a} y={Y - R - 9} width={b - a} height={(R + 9) * 2} rx={16} fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />;
        })}
      {/* nodes of Ranvier: where the action potential is regenerated */}
      {myelin &&
        NODES.map((f, i) => {
          const lit = sent && node !== null && i <= node;
          const current = sent && node === i && !done;
          return (
            <g key={i} data-node={i} data-lit={lit ? "true" : "false"}>
              <rect x={nx(f) - 4} y={Y - R} width={8} height={R * 2} fill={lit ? "#1F5BFF" : "#CBD5E1"} opacity={lit && !current ? 0.55 : 1} />
              {current && <circle cx={nx(f)} cy={Y} r={R + 8} fill="#1F5BFF" opacity="0.18" />}
            </g>
          );
        })}
      {/* labels */}
      {myelin ? (
        <g fontSize="11" fill="#334155">
          <text x={(nx(NODES[1]) + nx(NODES[2])) / 2} y={Y - R - 16} textAnchor="middle" fontWeight="600">
            Myelin sheath
          </text>
          <line x1={nx(NODES[4])} x2={nx(NODES[4])} y1={Y + R + 2} y2={Y + R + 16} stroke="#64748B" />
          <text x={nx(NODES[4])} y={Y + R + 30} textAnchor="middle" fontWeight="600">
            Node of Ranvier
          </text>
        </g>
      ) : (
        <text x={W / 2} y={Y + R + 26} fontSize="11" fill="#334155" textAnchor="middle" fontWeight="600">
          Axon membrane, no myelin
        </text>
      )}
      <text x={X1 + 4} y={Y - R - 14} fontSize="10.5" fill="#475569" textAnchor="end">
        toward the axon terminal →
      </text>
    </svg>
  );
}

export function ConductionExplorer() {
  const { reduced } = useStageMode();
  const [myelin, setMyelin] = useState(true);
  const [s, setS] = useState(0);
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<string>(NEW.myelinOn);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function toggle(on: boolean) {
    cancelAnimationFrame(frame.current);
    setMyelin(on);
    setSent(false);
    setS(0);
    setStatus(on ? NEW.myelinOn : NEW.myelinOff);
  }

  function send() {
    cancelAnimationFrame(frame.current);
    const total = myelin ? TRAVEL_S.myelinated : TRAVEL_S.unmyelinated;
    const done = myelin ? NEW.arrivedMyelin : NEW.arrivedBare;
    setSent(true);
    if (reduced) {
      setS(total);
      setStatus(done);
      return;
    }
    setStatus("");
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = (now - t0) / 1000;
      setS(el);
      if (el < total) frame.current = requestAnimationFrame(tick);
      else setStatus(done);
    };
    frame.current = requestAnimationFrame(tick);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14" data-explorer="conduction">
      <div className="min-w-0 space-y-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" role="switch" checked={myelin} onChange={(e) => toggle(e.target.checked)} className="peer sr-only" />
          <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-hema/20 transition-colors peer-checked:bg-hema peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-eosin peer-focus-visible:outline">
            <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all motion-reduce:transition-none ${myelin ? "left-6" : "left-1"}`} />
          </span>
          <span className="text-[1.05rem] font-semibold text-hema">Myelin</span>
        </label>
        <button type="button" onClick={send} className="sig-button-primary">
          Send an action potential
        </button>
        <p role="status" aria-live="polite" className="min-h-[3.5rem] rounded-xl border border-hairline bg-mist px-4 py-3 text-[1.02rem] leading-relaxed text-specimen" data-conduction-status>
          {status}
        </p>
      </div>
      <figure className="min-w-0 rounded-2xl border border-hairline bg-white p-3 sm:p-5">
        <AxonFigure myelin={myelin} s={s} sent={sent} />
        <figcaption className="mt-2 text-[0.9rem] text-quiet">{NEW.speedNote}</figcaption>
      </figure>
    </div>
  );
}
