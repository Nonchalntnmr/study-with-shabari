import type { CSSProperties } from "react";

// The application as six stations on a ruled line, from the /experience/admissions prototype
// (docs/EXPERIENCE.md on experience/beauty-of-intelligence). The prototype opened one station at a
// time as a tab set; here every station is on the page at once, so none of the approved help is
// behind a click, and the page needs no client JavaScript. Every word comes from the server page
// (founder-facts admissionsHelp).
//
// The rule inks itself from station to station as the line scrolls up the screen: a CSS
// scroll-driven animation (admissions.css), so nothing moves unless the reader scrolls, the scroll
// itself is never touched, and with reduced motion or without support the line is simply drawn.

const NUMERALS = ["I", "II", "III", "IV", "V", "VI"];

export type Station = { title: string; body: string };

export function Journey({ stations }: { stations: readonly Station[] }) {
  return (
    <ol className="adm-journey">
      {stations.map((s, i) => (
        <li key={s.title} className="adm-station" style={{ "--i": i } as CSSProperties}>
          <span aria-hidden className="adm-disc">
            {NUMERALS[i] ?? i + 1}
          </span>
          {i < stations.length - 1 && (
            <span aria-hidden className="adm-seg">
              <span className="adm-seg-ink" />
            </span>
          )}
          <div className="adm-station-text">
            <h3 className="adm-station-title">{s.title}</h3>
            <p className="adm-station-body">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
