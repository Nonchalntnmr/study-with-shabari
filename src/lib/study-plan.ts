// A study plan derived only from the student's own submitted work and test date.
// Pure, so every recommendation is explainable and unit-tested.

export type PlanSection = { section: string; answered: number; accuracy: number | null };
export type PlanTopic = { name: string; answered: number; accuracy: number | null };
export type PlanExam = { slug: string; title: string; section: string; attempted: boolean; bestAccuracy: number | null };

export type StudyPlan = {
  weeksLeft: number | null;
  phase: "no-date" | "past" | "content" | "practice" | "final";
  phaseText: string;
  focusSections: string[];
  focusTopics: PlanTopic[];
  nextSets: PlanExam[];
  tasks: string[];
  hasData: boolean;
};

const SCIENCE = ["CP", "BB", "PS"];
const WEEK = 7 * 86_400_000;

export function buildStudyPlan(input: {
  today: Date;
  testDate: Date | null;
  sections: PlanSection[];
  weakTopics: PlanTopic[];
  exams: PlanExam[];
  sectionLabel: (code: string) => string;
}): StudyPlan {
  const { today, testDate, sections, weakTopics, exams, sectionLabel } = input;
  const hasData = sections.some((s) => s.answered > 0);

  const weeksLeft = testDate ? Math.floor((testDate.getTime() - today.getTime()) / WEEK) : null;
  const phase: StudyPlan["phase"] =
    weeksLeft === null ? "no-date" : testDate!.getTime() < today.getTime() ? "past" : weeksLeft > 12 ? "content" : weeksLeft >= 4 ? "practice" : "final";
  const phaseText = {
    "no-date": "Add your test date to pace this plan week by week.",
    past: "Your saved test date has passed. Update it if you’re testing again.",
    content: "You have time: spend most of it on content review, with a practice set each week to check what’s sticking.",
    practice: "Shift toward practice: several passage sets a week, and review every miss until you can say why the right answer is right.",
    final: "Final stretch: timed practice under test conditions and targeted review of your weakest topics. Avoid starting new material.",
  }[phase];

  // Weakest sections first among those with enough answers; untouched sections go first of all.
  const bySection = new Map(sections.map((s) => [s.section, s]));
  const focusSections = [...SCIENCE].sort((a, b) => {
    const sa = bySection.get(a);
    const sb = bySection.get(b);
    const score = (s?: PlanSection) => (!s || s.answered < 3 || s.accuracy === null ? -1 : s.accuracy);
    return score(sa) - score(sb);
  });

  const order = new Map(focusSections.map((s, i) => [s, i]));
  const unattempted = exams.filter((e) => !e.attempted).sort((a, b) => (order.get(a.section) ?? 9) - (order.get(b.section) ?? 9));
  const retake = exams
    .filter((e) => e.attempted && e.bestAccuracy !== null && e.bestAccuracy < 0.8)
    .sort((a, b) => (a.bestAccuracy ?? 0) - (b.bestAccuracy ?? 0));
  const nextSets = [...unattempted, ...retake].slice(0, 3);

  const focusTopics = weakTopics.slice(0, 3);
  const tasks: string[] = [];
  for (const t of focusTopics) tasks.push(`Review your notes on ${t.name}, then redo the questions you missed on it.`);
  for (const e of nextSets) tasks.push(e.attempted ? `Retake “${e.title}” and compare with your last attempt.` : `Take “${e.title}”.`);
  if (!hasData) tasks.push(`Take one practice set in each section (${SCIENCE.map(sectionLabel).join(", ")}) so your plan has something to work from.`);
  if (phase === "final") tasks.push("Do at least one set timed, in one sitting, at the time of day your test is scheduled.");

  return { weeksLeft: phase === "past" ? 0 : weeksLeft, phase, phaseText, focusSections, focusTopics, nextSets, tasks, hasData };
}
