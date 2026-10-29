"use client";

import { MODEL_LABELS, labelNodes } from "./scene/labels";

export function ModelLabels() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {MODEL_LABELS.map((l, i) => (
        <div
          key={l.text}
          ref={(el) => {
            labelNodes[i] = el;
          }}
          style={{ opacity: 0 }}
          className={`absolute left-0 top-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] shadow-sm will-change-transform ${
            l.tone === "accent" ? "bg-eosin font-semibold text-specimen" : "border border-hairline bg-[#F6F8F7] font-medium text-hema"
          }`}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}
