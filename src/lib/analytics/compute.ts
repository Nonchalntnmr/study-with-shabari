// Pure analytics over scored responses. No database, no server-only imports,
// so every number a student or admin sees is unit-testable.

export type ScoredResponse = {
  questionId: string;
  attemptId: string;
  section: string;
  topics: string[]; // topic slugs
  isCorrect: boolean;
  timeSpentMs: number;
  difficulty: number | null;
  answeredAt: Date;
};

export type Tally = { answered: number; correct: number; accuracy: number | null; avgTimeSec: number | null };

export function tally(rows: ScoredResponse[]): Tally {
  const answered = rows.length;
  if (answered === 0) return { answered: 0, correct: 0, accuracy: null, avgTimeSec: null };
  const correct = rows.filter((r) => r.isCorrect).length;
  const totalMs = rows.reduce((sum, r) => sum + Math.max(0, r.timeSpentMs), 0);
  return {
    answered,
    correct,
    accuracy: correct / answered,
    avgTimeSec: totalMs / answered / 1000,
  };
}

/**
 * Lower bound of the 95% Wilson interval. Ranks "weakest" topics by what the
 * data supports, so 1 of 1 correct does not outrank 18 of 20.
 */
export function wilsonLowerBound(correct: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = correct / n;
  const z2 = z * z;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return Math.max(0, (centre - margin) / (1 + z2 / n));
}

export function bySection(rows: ScoredResponse[]): Array<{ section: string } & Tally> {
  const groups = new Map<string, ScoredResponse[]>();
  for (const r of rows) groups.set(r.section, [...(groups.get(r.section) ?? []), r]);
  return [...groups.entries()]
    .map(([section, g]) => ({ section, ...tally(g) }))
    .sort((a, b) => a.section.localeCompare(b.section));
}

export type TopicStat = { topic: string; confidence: number } & Tally;

export function byTopic(rows: ScoredResponse[]): TopicStat[] {
  const groups = new Map<string, ScoredResponse[]>();
  for (const r of rows) {
    for (const t of r.topics) groups.set(t, [...(groups.get(t) ?? []), r]);
  }
  return [...groups.entries()].map(([topic, g]) => {
    const t = tally(g);
    return { topic, ...t, confidence: wilsonLowerBound(t.correct, t.answered) };
  });
}

/** Weakest topics first; needs `minAnswered` responses before a topic is judged. */
export function weakestTopics(rows: ScoredResponse[], limit = 5, minAnswered = 3): TopicStat[] {
  return byTopic(rows)
    .filter((t) => t.answered >= minAnswered)
    .sort((a, b) => a.confidence - b.confidence || b.answered - a.answered)
    .slice(0, limit);
}

export function strongestTopics(rows: ScoredResponse[], limit = 5, minAnswered = 3): TopicStat[] {
  return byTopic(rows)
    .filter((t) => t.answered >= minAnswered)
    .sort((a, b) => b.confidence - a.confidence || b.answered - a.answered)
    .slice(0, limit);
}

export type AttemptPoint = { attemptId: string; at: Date; answered: number; accuracy: number };

/** One point per attempt, oldest first, for the progress chart. */
export function attemptTrend(rows: ScoredResponse[]): AttemptPoint[] {
  const groups = new Map<string, ScoredResponse[]>();
  for (const r of rows) groups.set(r.attemptId, [...(groups.get(r.attemptId) ?? []), r]);
  return [...groups.entries()]
    .map(([attemptId, g]) => {
      const t = tally(g);
      const at = new Date(Math.max(...g.map((r) => r.answeredAt.getTime())));
      return { attemptId, at, answered: t.answered, accuracy: t.accuracy ?? 0 };
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Compares the mean of the last `window` attempts with the `window` before
 * them. Returns null until there are enough attempts to say anything.
 */
export function momentum(points: AttemptPoint[], window = 3): number | null {
  if (points.length < window * 2) return null;
  const mean = (p: AttemptPoint[]) => p.reduce((s, x) => s + x.accuracy, 0) / p.length;
  const recent = mean(points.slice(-window));
  const before = mean(points.slice(-window * 2, -window));
  return recent - before;
}

export type Pacing = { fastWrong: number; slowRight: number; medianSec: number | null };

/** Rushed misses and slow hits point at different study habits. */
export function pacing(rows: ScoredResponse[]): Pacing {
  if (rows.length === 0) return { fastWrong: 0, slowRight: 0, medianSec: null };
  const secs = rows.map((r) => r.timeSpentMs / 1000).sort((a, b) => a - b);
  const mid = Math.floor(secs.length / 2);
  const medianSec = secs.length % 2 ? secs[mid] : (secs[mid - 1] + secs[mid]) / 2;
  const fastWrong = rows.filter((r) => !r.isCorrect && r.timeSpentMs / 1000 < medianSec * 0.5).length;
  const slowRight = rows.filter((r) => r.isCorrect && r.timeSpentMs / 1000 > medianSec * 1.5).length;
  return { fastWrong, slowRight, medianSec };
}

export type DifficultyBand = { band: "easier" | "medium" | "harder" | "unrated" } & Tally;

export function byDifficulty(rows: ScoredResponse[]): DifficultyBand[] {
  const band = (d: number | null): DifficultyBand["band"] =>
    d == null ? "unrated" : d <= 2 ? "easier" : d === 3 ? "medium" : "harder";
  const order: DifficultyBand["band"][] = ["easier", "medium", "harder", "unrated"];
  return order
    .map((b) => ({ band: b, ...tally(rows.filter((r) => band(r.difficulty) === b)) }))
    .filter((b) => b.answered > 0);
}

/** Share a number as a whole percent, or an em dash when there is no data. */
export function pct(value: number | null): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}
