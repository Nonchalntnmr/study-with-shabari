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

export const MIN_TOPIC_SAMPLE = 3;

/** Weakest topics with enough answered questions to mean something. */
export function weakestTopics(stats: TopicStat[], limit = 3, minSample = MIN_TOPIC_SAMPLE): TopicStat[] {
  return stats.filter((s) => s.total >= minSample && s.accuracy < 0.8).slice(0, limit);
}

export function percent(correct: number, total: number): number {
  return total ? Math.round((correct / total) * 100) : 0;
}
