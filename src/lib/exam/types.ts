// Shapes sent to the browser. Runner types deliberately carry no correctness,
// rationale or explanation fields: those exist only on results types.

import type { HighlightRange } from "./passage";

export type RunnerFigure = { id: string; url: string; alt: string; caption: string | null };

export type RunnerPassage = {
  id: string;
  title: string;
  paragraphs: string[];
  source: string | null;
  /** A figure given as text, shown as a caption box under the passage. */
  figureText: string | null;
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
  /** When the student last changed the answer, on the server's clock (ms). 0 when unknown. */
  changedAt: number;
};

export type RunnerState = {
  attemptId: string;
  exam: { title: string; section: string; slug: string };
  mode: "TIMED" | "UNTIMED";
  /** A retest of the questions missed in an earlier attempt. */
  isRetest: boolean;
  /** The deadline passed while this browser may hold unsaved answers: deliver them and submit. */
  deliverOnly: boolean;
  startedAt: string;
  deadlineAt: string | null;
  serverNow: string;
  lastPosition: number;
  questions: RunnerQuestion[];
  passages: Record<string, RunnerPassage>;
  responses: Record<string, RunnerResponse>;
  highlights: Record<string, HighlightRange[]>;
};

export type SubmitResult =
  | { status: "submitted"; autoSubmitted: boolean }
  /** A timeout submit arrived before the server's deadline: keep going, re-anchored to this time. */
  | { status: "not_expired"; deadlineAt: string; serverNow: string };

export type SyncResult =
  | { ok: true; status: "IN_PROGRESS"; serverNow: string; deadlineAt: string | null }
  | { ok: false; status: "SUBMITTED"; reason: "time_expired" | "already_submitted" };
