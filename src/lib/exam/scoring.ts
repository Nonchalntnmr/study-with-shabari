// Pure scoring and analytics. Results are percent correct. We never estimate an
// official scaled score: no AAMC conversion table applies to original questions.

export type ScoringQuestion = {
  id: string;
  correctChoiceId: string | null;
  topics: { slug: string; name: string }[];
};

export type ScoringResponse = {
  questionId: string;
  selectedChoiceId: string | null;
  timeSpentMs: number;
};

export type ScoredItem = {
  questionId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean;
  answered: boolean;
  timeSpentMs: number;
};

export function scoreAttempt(questions: ScoringQuestion[], responses: ScoringResponse[]) {
  const byQuestion = new Map(responses.map((r) => [r.questionId, r]));
  const items: ScoredItem[] = questions.map((q) => {
    const r = byQuestion.get(q.id);
    const selected = r?.selectedChoiceId ?? null;
    return {
      questionId: q.id,
      selectedChoiceId: selected,
      answered: selected !== null,
      isCorrect: selected !== null && selected === q.correctChoiceId,
      timeSpentMs: r?.timeSpentMs ?? 0,
    };
  });
  const correct = items.filter((i) => i.isCorrect).length;
  return { items, correct, total: items.length };
}

export type TopicStat = { slug: string; name: string; correct: number; total: number; accuracy: number };

/** Per-topic accuracy. A question tagged with two topics counts toward both. */
export function topicBreakdown(
  questions: ScoringQuestion[],
  outcomes: { questionId: string; isCorrect: boolean }[],
): TopicStat[] {
  const qById = new Map(questions.map((q) => [q.id, q]));
  const stats = new Map<string, TopicStat>();
  for (const o of outcomes) {
    for (const t of qById.get(o.questionId)?.topics ?? []) {
      const s = stats.get(t.slug) ?? { slug: t.slug, name: t.name, correct: 0, total: 0, accuracy: 0 };
      s.total += 1;
      if (o.isCorrect) s.correct += 1;
      stats.set(t.slug, s);
    }
  }
  return [...stats.values()]
    .map((s) => ({ ...s, accuracy: s.total ? s.correct / s.total : 0 }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total || a.name.localeCompare(b.name));
}

// Authored difficulty is 1–5; content imports map easy, medium and hard to 2, 3 and 4.
const DIFFICULTY_BANDS = [
  { slug: "easy", name: "Easy", max: 2 },
  { slug: "medium", name: "Medium", max: 3 },
  { slug: "hard", name: "Hard", max: 5 },
] as const;

/** Accuracy by difficulty band, easiest first. Questions without a difficulty are left out. */
export function difficultyBreakdown(rows: { difficulty: number | null; isCorrect: boolean }[]): TopicStat[] {
  return DIFFICULTY_BANDS.map(({ slug, name, max }, i) => {
    const min = i === 0 ? 1 : DIFFICULTY_BANDS[i - 1].max + 1;
    const inBand = rows.filter((r) => r.difficulty !== null && r.difficulty >= min && r.difficulty <= max);
    const correct = inBand.filter((r) => r.isCorrect).length;
    return { slug, name, correct, total: inBand.length, accuracy: inBand.length ? correct / inBand.length : 0 };
  }).filter((s) => s.total > 0);
}

export const MIN_TOPIC_SAMPLE = 3;

/** Weakest topics with enough answered questions to mean something. */
export function weakestTopics(stats: TopicStat[], limit = 3, minSample = MIN_TOPIC_SAMPLE): TopicStat[] {
  return stats.filter((s) => s.total >= minSample && s.accuracy < 0.8).slice(0, limit);
}

export function percent(correct: number, total: number): number {
  return total ? Math.round((correct / total) * 100) : 0;
}
