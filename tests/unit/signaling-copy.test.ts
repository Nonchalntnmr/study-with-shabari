import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LESSON, NEW } from "@/lib/explore/signaling-copy";
import { SIGNALING_QUESTIONS, checkSignaling, publicSignalingQuestions } from "@/lib/explore/signaling-questions";

describe("signaling explorer copy and questions", () => {
  it("takes every LESSON line verbatim from the approved dopamine lesson page", () => {
    const dopPage = fs.readFileSync(path.join(process.cwd(), "src/app/(site)/dopamine/page.tsx"), "utf8");
    const dopLib = fs.readFileSync(path.join(process.cwd(), "src/lib/lessons/dopamine-page.ts"), "utf8");
    const combined = dopPage + "\n" + dopLib;
    for (const [k, line] of Object.entries(LESSON)) {
      expect(combined, `LESSON.${k} must be on the dopamine lesson page`).toContain(line);
    }
  });

  it("logs every NEW sentence and question in docs/STAGE-TEXT-FOR-SHABARI.md", () => {
    const log = fs.readFileSync(path.join(process.cwd(), "docs/STAGE-TEXT-FOR-SHABARI.md"), "utf8");
    for (const [k, line] of Object.entries(NEW)) {
      expect(log, `NEW.${k} missing from STAGE-TEXT-FOR-SHABARI.md`).toContain(line);
    }
    for (const q of SIGNALING_QUESTIONS) {
      expect(log, `stem ${q.id}`).toContain(q.stem);
      expect(log, `explanation ${q.id}`).toContain(q.explanation);
    }
  });

  it("strips answers and explanations from publicSignalingQuestions and checks answers on the server", () => {
    const pub = publicSignalingQuestions();
    expect(pub).toHaveLength(3);
    for (const q of pub) {
      expect("answer" in q).toBe(false);
      expect("explanation" in q).toBe(false);
    }
    const right = checkSignaling("threshold", 2);
    expect(right).toMatchObject({ correct: true, answer: 2 });
    const wrong = checkSignaling("threshold", 0);
    expect(wrong).toMatchObject({ correct: false, answer: 2 });
    expect(checkSignaling("unknown", 0)).toHaveProperty("error");
  });
});
