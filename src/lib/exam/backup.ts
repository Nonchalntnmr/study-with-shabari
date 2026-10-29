import type { HighlightRange } from "./passage";
import type { RunnerResponse } from "./types";

// The on-device copy of answers that haven't reached the server yet. It is
// shared by every tab of the attempt (one localStorage key), so writes merge
// per question, newest change wins, and a tab only removes what it saved.

export type HighlightEntry = { ranges: HighlightRange[]; changedAt: number };
export type Backup = { v: 2; responses: Record<string, RunnerResponse>; highlights: Record<string, HighlightEntry> };

export const emptyBackup = (): Backup => ({ v: 2, responses: {}, highlights: {} });

/** Reads either format. Version 1 (before change times) had bare ranges and no changedAt. */
export function parseBackup(raw: string | null): Backup {
  if (!raw) return emptyBackup();
  try {
    const data = JSON.parse(raw) as { v?: number; responses?: Record<string, Partial<RunnerResponse>>; highlights?: Record<string, unknown> };
    const out = emptyBackup();
    for (const [id, r] of Object.entries(data.responses ?? {})) {
      out.responses[id] = {
        selectedChoiceId: r.selectedChoiceId ?? null,
        eliminatedChoiceIds: Array.isArray(r.eliminatedChoiceIds) ? r.eliminatedChoiceIds : [],
        flagged: Boolean(r.flagged),
        timeSpentMs: Number(r.timeSpentMs) || 0,
        changedAt: Number(r.changedAt) || 0,
      };
    }
    for (const [id, h] of Object.entries(data.highlights ?? {})) {
      out.highlights[id] = Array.isArray(h) ? { ranges: h as HighlightRange[], changedAt: 0 } : (h as HighlightEntry);
    }
    return out;
  } catch {
    return emptyBackup();
  }
}

/** Adds entries, keeping whichever copy of each question was changed last. */
export function mergeBackup(base: Backup, add: { responses?: Record<string, RunnerResponse>; highlights?: Record<string, HighlightEntry> }): Backup {
  const out: Backup = { v: 2, responses: { ...base.responses }, highlights: { ...base.highlights } };
  for (const [id, r] of Object.entries(add.responses ?? {})) {
    const cur = out.responses[id];
    if (!cur || r.changedAt >= cur.changedAt) out.responses[id] = { ...r, timeSpentMs: Math.max(r.timeSpentMs, cur?.timeSpentMs ?? 0) };
    else out.responses[id] = { ...cur, timeSpentMs: Math.max(r.timeSpentMs, cur.timeSpentMs) };
  }
  for (const [id, h] of Object.entries(add.highlights ?? {})) {
    const cur = out.highlights[id];
    if (!cur || h.changedAt >= cur.changedAt) out.highlights[id] = h;
  }
  return out;
}

/** Removes what the server confirmed: entries no newer than the saved copy. Newer changes (another tab's) stay. */
export function pruneBackup(base: Backup, saved: { responses?: Record<string, number>; highlights?: Record<string, number> }): Backup {
  const out: Backup = { v: 2, responses: { ...base.responses }, highlights: { ...base.highlights } };
  for (const [id, changedAt] of Object.entries(saved.responses ?? {})) if (out.responses[id] && out.responses[id].changedAt <= changedAt) delete out.responses[id];
  for (const [id, changedAt] of Object.entries(saved.highlights ?? {})) if (out.highlights[id] && out.highlights[id].changedAt <= changedAt) delete out.highlights[id];
  return out;
}

export const isEmptyBackup = (b: Backup) => Object.keys(b.responses).length === 0 && Object.keys(b.highlights).length === 0;

/**
 * Which backed-up answers to put back on screen and resend after a reload:
 * those at least as new as the server's copy. An older backup never replaces
 * an answer the server already has from later.
 */
export function restorable(backup: Backup, server: Record<string, RunnerResponse>): Record<string, RunnerResponse> {
  const out: Record<string, RunnerResponse> = {};
  for (const [id, r] of Object.entries(backup.responses)) {
    const s = server[id];
    if (!s || r.changedAt >= s.changedAt) out[id] = r;
  }
  return out;
}
