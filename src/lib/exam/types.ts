// Shapes sent to the browser. Runner types deliberately carry no correctness,
// rationale or explanation fields: those exist only on results types.

import type { HighlightRange } from "./passage";

export type RunnerFigure = { id: string; url: string; alt: string; caption: string | null };

export type RunnerPassage = {
  id: string;
  title: string;
  paragraphs: string[];
  source: string | null;
  figures: RunnerFigure[];
};

export type RunnerChoice = { id: string; label: string; text: string };

export type RunnerQuestion = {
  id: string;
  number: number;
  passageId: string | null;
  stem: string;
  figure: RunnerFigure | null;
  choices: RunnerChoice[];
};

export type RunnerResponse = {
  selectedChoiceId: string | null;
  eliminatedChoiceIds: string[];
  flagged: boolean;
  timeSpentMs: number;
};

export type RunnerState = {
  attemptId: string;
  exam: { title: string; section: string; slug: string };
  mode: "TIMED" | "UNTIMED";
  startedAt: string;
  deadlineAt: string | null;
  serverNow: string;
  lastPosition: number;
  questions: RunnerQuestion[];
  passages: Record<string, RunnerPassage>;
  responses: Record<string, RunnerResponse>;
  highlights: Record<string, HighlightRange[]>;
};

export type SyncResult =
  | { ok: true; status: "IN_PROGRESS"; serverNow: string; deadlineAt: string | null }
  | { ok: false; status: "SUBMITTED"; reason: "time_expired" | "already_submitted" };
