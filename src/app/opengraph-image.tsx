import { ImageResponse } from "next/og";

export const alt = "Study with Shabari: MCAT tutoring from a 522 scorer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#10254b", color: "white", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 600 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "white", color: "#10254b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>S</div>
          Study with Shabari
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>MCAT tutoring from someone who just took it.</div>
          <div style={{ fontSize: 32, color: "#bfdbfe" }}>522 in January 2026 · Free notes · Original practice sets</div>
        </div>
        <div style={{ display: "flex", height: 14, borderRadius: 7, background: "rgba(255,255,255,0.15)" }}>
          <div style={{ width: "89%", borderRadius: 7, background: "#f3e15a" }} />
        </div>
      </div>
    ),
    size,
  );
}
