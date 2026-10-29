"use client";

import { ChevronLeft, ChevronRight, CloudOff, Flag, Highlighter, LayoutGrid, ListChecks, Loader2, Check, Eraser } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emptyBackup, isEmptyBackup, mergeBackup, parseBackup, pruneBackup, restorable, type Backup, type HighlightEntry } from "@/lib/exam/backup";
import { normalizeRanges, subtractRange, type HighlightRange } from "@/lib/exam/passage";
import type { RunnerResponse, RunnerState, SubmitResult, SyncResult } from "@/lib/exam/types";
import { cn } from "@/lib/utils";
import { ChoiceList } from "./choice-list";
import { ExamClock } from "./exam-clock";
import { PassagePane, selectionToRanges } from "./passage-pane";

const EMPTY: RunnerResponse = { selectedChoiceId: null, eliminatedChoiceIds: [], flagged: false, timeSpentMs: 0, changedAt: 0 };
type SaveStatus = "saved" | "saving" | "offline" | "error" | "signed_out" | "lost";

const backupKey = (id: string) => `sws:attempt:${id}`;
function loadBackup(id: string): Backup {
  try {
    return parseBackup(localStorage.getItem(backupKey(id)));
  } catch {
    return emptyBackup();
  }
}
function storeBackup(id: string, b: Backup) {
  try {
    if (isEmptyBackup(b)) localStorage.removeItem(backupKey(id));
    else localStorage.setItem(backupKey(id), JSON.stringify(b));
  } catch {
    // Storage can be unavailable (private mode); the server copy is the source of truth anyway.
  }
}
/** Read-modify-write on the shared key, so another tab's entries are never overwritten. */
const updateBackup = (id: string, fn: (b: Backup) => Backup) => storeBackup(id, fn(loadBackup(id)));

type TabMessage =
  | { t: "response"; id: string; r: RunnerResponse }
  | { t: "highlights"; id: string; h: HighlightEntry }
  | { t: "submitted" };

export function ExamRunner({ initial }: { initial: RunnerState }) {
  const router = useRouter();
  const { attemptId, questions, passages } = initial;
  const [index, setIndex] = useState(initial.lastPosition);
  const [responses, setResponses] = useState<Record<string, RunnerResponse>>(initial.responses);
  const [highlights, setHighlights] = useState<Record<string, HighlightRange[]>>(initial.highlights);
  const [view, setView] = useState<"question" | "review">("question");
  const [mobilePane, setMobilePane] = useState<"passage" | "question">("passage");
  const [navOpen, setNavOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "incomplete" | "flagged">("all");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [submitting, setSubmitting] = useState(initial.deliverOnly);
  const [hasSelection, setHasSelection] = useState(false);
  const [deadlineAt, setDeadlineAt] = useState(initial.deadlineAt);
  const [clockArm, setClockArm] = useState(0);

  const q = questions[index];
  const passage = q?.passageId ? passages[q.passageId] : null;
  const response = responses[q?.id] ?? EMPTY;

  // ---------------------------------------------------------------- server clock
  // Server time = the server's clock at the last sync plus monotonic time since. The
  // device clock is never read, so changing it (or waking from sleep) can't move the timer.
  const anchor = useRef<{ serverNow: number; perfAt: number } | null>(null);
  const serverTime = useCallback(() => {
    anchor.current ??= { serverNow: Date.parse(initial.serverNow), perfAt: performance.now() };
    return anchor.current.serverNow + (performance.now() - anchor.current.perfAt);
  }, [initial.serverNow]);
  const reanchor = (serverNowIso: string, sentAt: number) => {
    const now = performance.now();
    anchor.current = { serverNow: Date.parse(serverNowIso) + (now - sentAt) / 2, perfAt: now };
  };

  // ---------------------------------------------------------------- autosave
  const stateRef = useRef({ responses, highlights, index });
  stateRef.current = { responses, highlights, index };
  // Latest unsaved copy of each changed answer and highlight set.
  const unsaved = useRef(new Map<string, RunnerResponse>());
  const unsavedH = useRef(new Map<string, HighlightEntry>());
  const timeDirty = useRef(new Set<string>());
  const dirtyPos = useRef(false);
  const timeRef = useRef<Record<string, number>>(Object.fromEntries(Object.entries(initial.responses).map(([k, v]) => [k, v.timeSpentMs])));
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1000);
  const closed = useRef(false);
  const pendingSubmit = useRef<null | "manual" | "timeout">(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const passageRef = useRef<HTMLDivElement>(null);

  const goToResults = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    storeBackup(attemptId, emptyBackup());
    router.replace(`/exam/${attemptId}/results`);
  }, [attemptId, router]);

  /** Everything not yet confirmed by the server. Kept dirty until a save succeeds. */
  const buildPayload = (withPosition: boolean) => {
    const s = stateRef.current;
    const ids = new Set([...unsaved.current.keys(), ...timeDirty.current]);
    const sent = { responses: {} as Record<string, number>, highlights: {} as Record<string, number> };
    const responsesOut = [...ids].map((id) => {
      const r = unsaved.current.get(id) ?? s.responses[id] ?? EMPTY;
      sent.responses[id] = r.changedAt;
      return {
        questionId: id,
        selectedChoiceId: r.selectedChoiceId,
        eliminatedChoiceIds: r.eliminatedChoiceIds,
        flagged: r.flagged,
        timeSpentMs: Math.round(timeRef.current[id] ?? r.timeSpentMs ?? 0),
        ...(r.changedAt ? { changedAt: Math.round(r.changedAt) } : {}),
      };
    });
    const highlightsOut = [...unsavedH.current.entries()].map(([id, h]) => {
      sent.highlights[id] = h.changedAt;
      return { passageId: id, ranges: h.ranges };
    });
    return { body: { responses: responsesOut, highlights: highlightsOut, ...(withPosition ? { lastPosition: s.index } : {}) }, sent, empty: !responsesOut.length && !highlightsOut.length && !withPosition };
  };

  /** After the server confirms: forget what it now has (newer local changes stay pending). */
  const confirmSaved = (sent: { responses: Record<string, number>; highlights: Record<string, number> }) => {
    for (const [id, at] of Object.entries(sent.responses)) {
      if ((unsaved.current.get(id)?.changedAt ?? -1) <= at) unsaved.current.delete(id);
      timeDirty.current.delete(id);
    }
    for (const [id, at] of Object.entries(sent.highlights)) if ((unsavedH.current.get(id)?.changedAt ?? -1) <= at) unsavedH.current.delete(id);
    updateBackup(attemptId, (b) => pruneBackup(b, sent));
  };

  const failStatus = (code: number): SaveStatus | null => (code === 401 ? "signed_out" : code === 404 ? "lost" : code === 400 ? "error" : null);

  const flush = useCallback(
    async (opts: { keepalive?: boolean; ping?: boolean } = {}): Promise<void> => {
      if (closed.current) return;
      if (inFlight.current) {
        await inFlight.current;
        if (unsaved.current.size || unsavedH.current.size || timeDirty.current.size || dirtyPos.current) return flushRef.current(opts);
        return;
      }
      const withPosition = dirtyPos.current;
      const { body, sent, empty } = buildPayload(withPosition);
      // A ping (no changes) still re-anchors the clock and learns about expiry.
      if (empty && !opts.ping) return;
      dirtyPos.current = false;

      if (!empty) setStatus("saving");
      const sentAt = performance.now();
      inFlight.current = (async () => {
        try {
          const res = await fetch(`/api/attempts/${attemptId}/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            keepalive: opts.keepalive,
          });
          if (res.ok) {
            const json = (await res.json()) as SyncResult;
            if (!json.ok) return goToResults();
            reanchor(json.serverNow, sentAt);
            if (json.deadlineAt !== deadlineAtRef.current) setDeadlineAt(json.deadlineAt);
            retryDelay.current = 1000;
            confirmSaved(sent);
            setStatus(unsaved.current.size || unsavedH.current.size ? "saving" : "saved");
            return;
          }
          if (withPosition) dirtyPos.current = true;
          const fatal = failStatus(res.status);
          if (fatal) return setStatus(fatal); // kept on the device; nothing is dropped
          throw new Error(String(res.status)); // 429, 5xx: retry
        } catch {
          if (withPosition) dirtyPos.current = true;
          setStatus("offline");
          schedule(retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
        } finally {
          inFlight.current = null;
        }
      })();
      await inFlight.current;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attemptId, goToResults],
  );
  const deadlineAtRef = useRef(deadlineAt);
  deadlineAtRef.current = deadlineAt;

  const flushRef = useRef(flush);
  flushRef.current = flush;
  function schedule(ms = 600) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), ms);
  }

  /** Record a change: on screen, in the unsaved set, on the device, and in other tabs. */
  const recordResponse = (id: string, r: RunnerResponse) => {
    unsaved.current.set(id, r);
    updateBackup(attemptId, (b) => mergeBackup(b, { responses: { [id]: { ...r, timeSpentMs: timeRef.current[id] ?? r.timeSpentMs } } }));
    channel.current?.postMessage({ t: "response", id, r } satisfies TabMessage);
    setStatus("saving");
    schedule();
  };

  // Restore anything that never reached the server (crash, offline, closed tab), unless the server has something newer.
  useEffect(() => {
    const b = loadBackup(attemptId);
    const back = restorable(b, initial.responses);
    if (Object.keys(back).length) {
      // localStorage only exists after hydration, so restoring unsynced answers has to happen here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResponses((r) => ({ ...r, ...back }));
      for (const [id, v] of Object.entries(back)) {
        timeRef.current[id] = Math.max(timeRef.current[id] ?? 0, v.timeSpentMs);
        unsaved.current.set(id, v);
      }
    }
    if (Object.keys(b.highlights).length) {
      setHighlights((h) => ({ ...h, ...Object.fromEntries(Object.entries(b.highlights).map(([id, e]) => [id, e.ranges])) }));
      for (const [id, e] of Object.entries(b.highlights)) unsavedH.current.set(id, e);
    }
    // Stale backup entries (the server has newer answers) are dropped.
    updateBackup(attemptId, (cur) => ({ ...cur, responses: Object.fromEntries(Object.entries(cur.responses).filter(([id]) => id in back)) }));
    if (initial.deliverOnly) void submitRef.current("timeout");
    else void flushRef.current({ ping: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Other tabs of this attempt: show their newer changes here; follow them to results.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(`sws:attempt:${attemptId}`);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<TabMessage>) => {
      const m = e.data;
      if (m.t === "submitted") return goToResults();
      if (m.t === "response") {
        setResponses((r) => ((r[m.id]?.changedAt ?? 0) < m.r.changedAt ? { ...r, [m.id]: m.r } : r));
        const mine = unsaved.current.get(m.id);
        if (mine && mine.changedAt <= m.r.changedAt) unsaved.current.delete(m.id); // that tab saves it
      }
      if (m.t === "highlights") {
        setHighlights((h) => ({ ...h, [m.id]: m.h.ranges }));
        const mine = unsavedH.current.get(m.id);
        if (mine && mine.changedAt <= m.h.changedAt) unsavedH.current.delete(m.id);
      }
    };
    return () => {
      ch.close();
      channel.current = null;
    };
  }, [attemptId, goToResults]);

  // Save when the tab is hidden or closed (keepalive lets the request outlive the page);
  // re-check the clock with the server when it comes back (sleep, tab switch); retry when online.
  useEffect(() => {
    const onHide = () => void flushRef.current({ keepalive: true });
    const onVisibility = () => (document.visibilityState === "hidden" ? onHide() : void flushRef.current({ ping: true }));
    const onOnline = () => {
      if (pendingSubmit.current) void submitRef.current(pendingSubmit.current);
      else void flushRef.current({ ping: true });
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Time on the visible question, accumulated in a ref and saved every ~15s.
  useEffect(() => {
    if (view !== "question" || !q) return;
    const dirty = timeDirty.current;
    let last = performance.now();
    let sinceSave = 0;
    const t = setInterval(() => {
      const nowT = performance.now();
      const delta = nowT - last;
      last = nowT;
      if (document.visibilityState !== "visible") return;
      timeRef.current[q.id] = (timeRef.current[q.id] ?? 0) + delta;
      sinceSave += delta;
      if (sinceSave >= 15_000) {
        sinceSave = 0;
        timeDirty.current.add(q.id);
        schedule();
      }
    }, 1000);
    return () => {
      clearInterval(t);
      dirty.add(q.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id, view]);

  // ---------------------------------------------------------------- actions
  const update = (patch: Partial<RunnerResponse>) => {
    const next = { ...(stateRef.current.responses[q.id] ?? EMPTY), ...patch, changedAt: serverTime() };
    setResponses((r) => ({ ...r, [q.id]: next }));
    recordResponse(q.id, next);
  };
  const select = (choiceId: string) =>
    update({ selectedChoiceId: choiceId, eliminatedChoiceIds: response.eliminatedChoiceIds.filter((c) => c !== choiceId) });
  const toggleStrike = (choiceId: string) => {
    const struck = response.eliminatedChoiceIds.includes(choiceId);
    update({
      eliminatedChoiceIds: struck ? response.eliminatedChoiceIds.filter((c) => c !== choiceId) : [...response.eliminatedChoiceIds, choiceId],
      selectedChoiceId: !struck && response.selectedChoiceId === choiceId ? null : response.selectedChoiceId,
    });
  };
  const toggleFlag = () => update({ flagged: !response.flagged });

  const go = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    setIndex(i);
    setView("question");
    dirtyPos.current = true;
    schedule();
  };
  const next = () => (index === questions.length - 1 ? setView("review") : go(index + 1));

  const editHighlights = (mode: "add" | "remove") => {
    if (!passage) return;
    const picked = selectionToRanges(passageRef.current);
    if (!picked.length) return;
    const lengths = passage.paragraphs.map((p) => p.length);
    const current = stateRef.current.highlights[passage.id] ?? [];
    const nextRanges = mode === "add" ? normalizeRanges([...current, ...picked], lengths) : picked.reduce(subtractRange, current);
    const entry: HighlightEntry = { ranges: nextRanges, changedAt: serverTime() };
    setHighlights((h) => ({ ...h, [passage.id]: nextRanges }));
    window.getSelection()?.removeAllRanges();
    setHasSelection(false);
    unsavedH.current.set(passage.id, entry);
    updateBackup(attemptId, (b) => mergeBackup(b, { highlights: { [passage.id]: entry } }));
    channel.current?.postMessage({ t: "highlights", id: passage.id, h: entry } satisfies TabMessage);
    schedule();
  };

  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      setHasSelection(!!sel && !sel.isCollapsed && !!passageRef.current?.contains(sel.anchorNode));
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  /**
   * Submit carries every unsaved change, and the server applies them and scores in
   * one transaction. The device copy is cleared only once the server confirms.
   * A "timeout" submit is the clock running out here; the server checks its own
   * deadline and may answer that there's time left (a wrong or sleeping clock).
   */
  const submit = useCallback(
    async (reason: "manual" | "timeout" = "manual") => {
      if (closed.current) return;
      setSubmitting(true);
      pendingSubmit.current = reason;
      if (timer.current) clearTimeout(timer.current);
      if (inFlight.current) await inFlight.current.catch(() => {});
      const s = stateRef.current;
      const current = questions[s.index];
      if (current) timeDirty.current.add(current.id);
      const { body, sent } = buildPayload(true);
      const sentAt = performance.now();
      try {
        const res = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, payload: body }),
        });
        if (res.ok) {
          const json = (await res.json()) as SubmitResult;
          pendingSubmit.current = null;
          if (json.status === "submitted") {
            confirmSaved(sent);
            channel.current?.postMessage({ t: "submitted" } satisfies TabMessage);
            return goToResults();
          }
          // Not over yet on the server's clock: correct ours and keep going.
          reanchor(json.serverNow, sentAt);
          setDeadlineAt(json.deadlineAt);
          setClockArm((n) => n + 1);
          setSubmitting(false);
          return;
        }
        const fatal = failStatus(res.status);
        if (fatal) {
          pendingSubmit.current = null;
          setStatus(fatal);
          setSubmitting(false);
          return;
        }
        throw new Error(String(res.status));
      } catch {
        // Offline or the server failed: nothing is lost. A timeout submit retries by itself.
        setStatus("offline");
        setSubmitting(reason === "timeout");
        if (reason === "timeout") setTimeout(() => pendingSubmit.current && void submitRef.current("timeout"), retryDelay.current);
        retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attemptId, goToResults, questions],
  );
  const submitRef = useRef(submit);
  submitRef.current = submit;

  // MCAT-style shortcuts. e.code, because Alt+letter produces symbols on macOS.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return;
      const map: Record<string, () => void> = {
        KeyN: next,
        KeyP: () => go(index - 1),
        KeyF: toggleFlag,
        KeyH: () => editHighlights("add"),
        KeyV: () => setNavOpen(true),
        KeyR: () => setView("review"),
      };
      const fn = map[e.code];
      if (fn && view === "question") {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---------------------------------------------------------------- render
  const answered = questions.filter((x) => responses[x.id]?.selectedChoiceId).length;
  const flaggedCount = questions.filter((x) => responses[x.id]?.flagged).length;
  const unanswered = questions.length - answered;

  return (
    <div className="flex h-dvh flex-col bg-white">
      {/* top bar */}
      <header className="flex items-center justify-between gap-3 bg-navy px-4 py-2.5 text-sm text-white">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {initial.exam.title}
            {initial.isRetest && " (retest of your misses)"}
          </p>
          <p className="text-xs text-white/70">
            {view === "review" ? "Review" : `Question ${index + 1} of ${questions.length}`} · {initial.mode === "TIMED" ? "Timed" : "Untimed"}
          </p>
        </div>
        <ExamClock key={clockArm} deadlineAt={deadlineAt} startedAt={initial.startedAt} serverTime={serverTime} onExpire={() => void submit("timeout")} />
      </header>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-sky px-3 py-1.5 text-sm text-navy">
        {view === "question" && passage && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editHighlights("add")}
              disabled={!hasSelection}
              title="Highlight selected passage text (Alt+H)"
            >
              <Highlighter className="size-4" /> Highlight
            </Button>
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => editHighlights("remove")} disabled={!hasSelection}>
              <Eraser className="size-4" /> Remove highlight
            </Button>
          </>
        )}
        {view === "question" && (
          <Button variant="ghost" size="sm" onClick={toggleFlag} aria-pressed={response.flagged} title="Flag for review (Alt+F)">
            <Flag className={cn("size-4", response.flagged && "fill-mark")} /> {response.flagged ? "Flagged" : "Flag for review"}
          </Button>
        )}
        <span className="ml-auto flex items-center gap-1.5 px-2 text-xs" role="status" aria-live="polite" data-testid="save-status">
          {status === "saving" && (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Saving…
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="size-3.5" /> Saved
            </>
          )}
          {status === "offline" && (
            <>
              <CloudOff className="size-3.5" /> {submitting ? "Offline. Your submission will go through when you’re back online." : "Offline, retrying. Your answers are kept on this device."}
            </>
          )}
          {status === "error" && <span className="text-danger">Couldn’t save one change. Reload the page; your answers are kept on this device.</span>}
          {status === "signed_out" && (
            <span className="text-danger">
              You’re signed out, so answers are being kept on this device.{" "}
              <a href={`/login?next=${encodeURIComponent(`/exam/${attemptId}`)}`} className="font-medium underline">
                Sign in to keep saving
              </a>
            </span>
          )}
          {status === "lost" && <span className="text-danger">This browser can’t save to this set any more. Your answers are kept on this device.</span>}
        </span>
      </div>

      {/* body */}
      <main className="min-h-0 flex-1">
        {initial.deliverOnly ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground" role="status">
            Time’s up. Saving the answers you made before the deadline, then showing your results…
          </p>
        ) : view === "review" ? (
          <ReviewScreen
            questions={questions}
            responses={responses}
            filter={reviewFilter}
            setFilter={setReviewFilter}
            onOpen={go}
            answered={answered}
            flagged={flaggedCount}
          />
        ) : q ? (
          <div className={cn("h-full", passage && "md:grid md:grid-cols-2")}>
            {passage && (
              <div className="flex border-b md:hidden">
                {(["passage", "question"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMobilePane(p)}
                    className={cn("flex-1 py-2 text-sm font-medium capitalize", mobilePane === p ? "border-b-2 border-navy text-navy" : "text-muted-foreground")}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {passage && (
              <section
                aria-label="Passage"
                // Focusable so keyboard users can scroll a long passage.
                tabIndex={0}
                className={cn("h-full overflow-y-auto border-r px-6 py-6 md:block md:px-10", mobilePane === "passage" ? "block" : "hidden")}
              >
                <PassagePane ref={passageRef} passage={passage} highlights={highlights[passage.id] ?? []} />
              </section>
            )}
            <section
              aria-label={`Question ${q.number}`}
              tabIndex={0}
              className={cn("h-full overflow-y-auto px-6 py-6 md:block md:px-10", passage && mobilePane !== "question" ? "hidden" : "block")}
            >
              <div className="mx-auto max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Question {q.number}
                  {passage ? " · passage-based" : " · discrete"}
                </p>
                <h2 className="mt-2 whitespace-pre-line font-reading text-lg font-normal leading-relaxed text-ink">{q.stem}</h2>
                {q.figure && (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded diagrams of unknown size
                  <img src={q.figure.url} alt={q.figure.alt} className="mt-4 max-w-full rounded border" />
                )}
                <ChoiceList questionId={q.id} choices={q.choices} response={response} onSelect={select} onToggleStrike={toggleStrike} />
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {/* bottom bar */}
      <footer className="flex items-center justify-between gap-2 bg-navy px-3 py-2">
        <div className="flex gap-1">
          <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => (view === "review" ? go(questions.length - 1) : go(index - 1))} disabled={view === "question" && index === 0}>
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setNavOpen(true)}>
            <LayoutGrid className="size-4" /> <span className="hidden sm:inline">Navigator</span>
          </Button>
        </div>
        <div className="flex gap-1">
          {view === "question" ? (
            <>
              <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setView("review")}>
                <ListChecks className="size-4" /> <span className="hidden sm:inline">Review</span>
              </Button>
              <Button className="bg-white text-navy hover:bg-sky" onClick={next}>
                {index === questions.length - 1 ? "Review answers" : "Next"} <ChevronRight className="size-4" />
              </Button>
            </>
          ) : (
            <Button className="bg-white text-navy hover:bg-sky" onClick={() => setConfirmOpen(true)} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit and see results"}
            </Button>
          )}
        </div>
      </footer>

      <Dialog open={navOpen} onOpenChange={setNavOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Navigator</DialogTitle>
          </DialogHeader>
          <ol className="grid grid-cols-5 gap-2 sm:grid-cols-8">
            {questions.map((x, i) => {
              const r = responses[x.id];
              return (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setNavOpen(false);
                      go(i);
                    }}
                    aria-label={`Question ${i + 1}, ${r?.selectedChoiceId ? "answered" : "unanswered"}${r?.flagged ? ", flagged" : ""}`}
                    className={cn(
                      "relative h-10 w-full rounded-lg border text-sm font-medium tabular-nums",
                      r?.selectedChoiceId ? "border-navy bg-navy text-white" : "bg-white text-ink",
                      i === index && view === "question" && "ring-2 ring-blue ring-offset-1",
                    )}
                  >
                    {i + 1}
                    {r?.flagged && <Flag className="absolute -right-1 -top-1 size-3.5 fill-mark text-navy" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="text-sm text-muted-foreground">
            {answered} answered · {unanswered} unanswered · {flaggedCount} flagged
          </p>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this practice set?</AlertDialogTitle>
            <AlertDialogDescription>
              {unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}; they’ll be marked incorrect.`
                : "You’ve answered every question."}
              {flaggedCount > 0 && ` ${flaggedCount} ${flaggedCount === 1 ? "is" : "are"} still flagged.`} You can’t change answers after you
              submit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submit("manual")}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReviewScreen({
  questions,
  responses,
  filter,
  setFilter,
  onOpen,
  answered,
  flagged,
}: {
  questions: RunnerState["questions"];
  responses: Record<string, RunnerResponse>;
  filter: "all" | "incomplete" | "flagged";
  setFilter: (f: "all" | "incomplete" | "flagged") => void;
  onOpen: (i: number) => void;
  answered: number;
  flagged: number;
}) {
  const rows = questions
    .map((x, i) => ({ x, i, r: responses[x.id] }))
    .filter(({ r }) => (filter === "incomplete" ? !r?.selectedChoiceId : filter === "flagged" ? r?.flagged : true));
  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-semibold">Review your answers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {answered} of {questions.length} answered · {flagged} flagged. Open any question to change it, or submit when you’re ready.
        </p>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter">
          {(["all", "incomplete", "flagged"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} aria-pressed={filter === f}>
              {f === "all" ? "Review all" : f === "incomplete" ? "Review incomplete" : "Review flagged"}
            </Button>
          ))}
        </div>
        <ul className="mt-5 divide-y rounded-2xl border">
          {rows.length === 0 && <li className="p-5 text-sm text-muted-foreground">Nothing here.</li>}
          {rows.map(({ x, i, r }) => (
            <li key={x.id}>
              <button type="button" onClick={() => onOpen(i)} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-sky">
                <span className="w-24 text-sm font-medium tabular-nums">Question {i + 1}</span>
                <span className={cn("text-sm", r?.selectedChoiceId ? "text-ink" : "font-medium text-danger")}>
                  {r?.selectedChoiceId ? "Complete" : "Incomplete"}
                </span>
                {r?.flagged && (
                  <span className="ml-auto flex items-center gap-1 text-sm text-navy">
                    <Flag className="size-3.5 fill-mark" aria-hidden /> Flagged
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
