import { createHash } from "node:crypto";
import { bankSchema, type Bank } from "./schema";

// Converts Shabari's full-length question files (content/questions/fl1-{cp,bb,ps}.json) into the content
// import format (schema.ts). Her answer keys lean heavily on B, and no explanation refers to a letter, so
// each question's choices are shuffled in an order seeded by its id: the same file always converts the same
// way, and the answer index is remapped to follow its choice.

export type SourceQuestion = {
  id: string;
  section: "CP" | "BB" | "PS";
  passage_id: string | null;
  passage_title: string | null;
  passage: string | null;
  figure_description: string | null;
  stem: string;
  choices: string[];
  answer: number;
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  reviewed: boolean;
};

const LABELS = ["A", "B", "C", "D"] as const;
const DIFFICULTY = { easy: 2, medium: 3, hard: 4 } as const;
const SECTION_TITLE = { CP: "Chem/Phys", BB: "Bio/Biochem", PS: "Psych/Soc" } as const;

const key = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** A permutation of 0..n-1 from the SHA-256 of the question id (Fisher–Yates). */
export function choiceOrder(id: string, n = 4): number[] {
  const bytes = createHash("sha256").update(id).digest();
  const order = [...Array(n).keys()];
  for (let i = n - 1, b = 0; i > 0; i--, b++) {
    const j = bytes[b] % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export type Distribution = Record<string, Record<"A" | "B" | "C" | "D", number>>;

const tally = (rows: { section: string; answer: number }[]): Distribution => {
  const d: Distribution = {};
  for (const r of rows) {
    d[r.section] ??= { A: 0, B: 0, C: 0, D: 0 };
    d[r.section][LABELS[r.answer]]++;
  }
  return d;
};

export function convertFullLength(name: string, questions: SourceQuestion[]): { bank: Bank; before: Distribution; after: Distribution } {
  const topics = new Map<string, { slug: string; name: string; section: SourceQuestion["section"] }>();
  const shuffled = questions.map((q) => {
    if (q.choices.length !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) throw new Error(`${q.id}: needs 4 choices and an answer 0–3`);
    const order = choiceOrder(q.id);
    const topicSlug = key(`${name}-${q.section}-${q.topic}`);
    topics.set(topicSlug, { slug: topicSlug, name: q.topic, section: q.section });
    return {
      source: q,
      answer: order.indexOf(q.answer),
      question: {
        id: key(q.id),
        stem: q.stem,
        choices: order.map((from, i) => ({ label: LABELS[i], text: q.choices[from], correct: from === q.answer })),
        explanation: q.explanation,
        topics: [topicSlug],
        difficulty: DIFFICULTY[q.difficulty],
      },
    };
  });

  const exams = (["CP", "BB", "PS"] as const)
    .map((section) => {
      const rows = shuffled.filter((r) => r.source.section === section);
      if (!rows.length) return null;
      // Consecutive questions sharing a passage_id form one passage item; the text is on its first question.
      const items: Bank["exams"][number]["items"] = [];
      for (const r of rows) {
        const pid = r.source.passage_id;
        const last = items.at(-1);
        if (pid && last?.type === "passage" && last.id === key(pid)) {
          last.questions.push(r.question);
        } else if (pid) {
          if (!r.source.passage) throw new Error(`${r.source.id}: first question of passage ${pid} has no passage text`);
          items.push({
            type: "passage",
            id: key(pid),
            title: r.source.passage_title ?? pid,
            body: r.source.passage,
            ...(r.source.figure_description ? { figure: r.source.figure_description } : {}),
            questions: [r.question],
          });
        } else {
          items.push({ type: "discrete", ...r.question });
        }
      }
      const passages = items.filter((i) => i.type === "passage").length;
      return {
        slug: key(`${name}-${section}`),
        title: `${name.toUpperCase()}: ${SECTION_TITLE[section]}`,
        description: `Full-length ${SECTION_TITLE[section]} section: ${passages} passages and ${rows.length} questions in 95 minutes.`,
        section,
        timeLimitMinutes: 95,
        isSample: false,
        items,
      };
    })
    .filter((e) => e !== null);

  const bank = bankSchema.parse({ version: 1, topics: [...topics.values()], exams });
  return {
    bank,
    before: tally(shuffled.map((r) => ({ section: r.source.section, answer: r.source.answer }))),
    after: tally(shuffled.map((r) => ({ section: r.source.section, answer: r.answer }))),
  };
}
