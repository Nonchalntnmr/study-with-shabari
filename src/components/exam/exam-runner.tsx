"use client";

import { ChevronLeft, ChevronRight, CloudOff, Flag, Highlighter, LayoutGrid, ListChecks, Loader2, Check, Eraser } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { normalizeRanges, subtractRange, type HighlightRange } from "@/lib/exam/passage";
import type { RunnerResponse, RunnerState, SyncResult } from "@/lib/exam/types";
import { cn } from "@/lib/utils";
import { ChoiceList } from "./choice-list";
import { ExamClock } from "./exam-clock";
import { PassagePane, selectionToRanges } from "./passage-pane";

const EMPTY: RunnerResponse = { selectedChoiceId: null, eliminatedChoiceIds: [], flagged: false, timeSpentMs: 0 };
type SaveStatus = "saved" | "saving" | "offline" | "error";
type Backup = { responses: Record<string, RunnerResponse>; highlights: Record<string, HighlightRange[]> };

const backupKey = (id: string) => `sws:attempt:${id}`;
function readBackup(id: string): Backup | null {
  try {
    const raw = localStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as Backup) : null;
  } catch {
    return null;
  }
}
function writeBackup(id: string, b: Backup | null) {
  try {
    if (b && (Object.keys(b.responses).length || Object.keys(b.highlights).length)) localStorage.setItem(backupKey(id), JSON.stringify(b));
    else localStorage.removeItem(backupKey(id));
  } catch {
    // Storage can be unavailable (private mode); the server copy is the source of truth anyway.
  }
}

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
  const [submitting, setSubmitting] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  const q = questions[index];
  const passage = q?.passageId ? passages[q.passageId] : null;
  const response = responses[q?.id] ?? EMPTY;

  // Clock skew between this device and the server, measured once at load.
  const serverOffsetMs = useMemo(() => Date.parse(initial.serverNow) - Date.now(), [initial.serverNow]);

  // ---------------------------------------------------------------- autosave
  const stateRef = useRef({ responses, highlights, index });
  stateRef.current = { responses, highlights, index };
  const dirtyR = useRef(new Set<string>());
  const dirtyH = useRef(new Set<string>());
  const dirtyPos = useRef(false);
  const timeRef = useRef<Record<string, number>>(Object.fromEntries(Object.entries(initial.responses).map(([k, v]) => [k, v.timeSpentMs])));
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1000);
  const closed = useRef(false);
  const passageRef = useRef<HTMLDivElement>(null);

  const goToResults = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    writeBackup(attemptId, null);
    router.replace(`/exam/${attemptId}/results`);
  }, [attemptId, router]);

  const snapshotBackup = useCallback(() => {
    const s = stateRef.current;
    writeBackup(attemptId, {
      responses: Object.fromEntries([...dirtyR.current].map((id) => [id, { ...(s.responses[id] ?? EMPTY), timeSpentMs: timeRef.current[id] ?? 0 }])),
      highlights: Object.fromEntries([...dirtyH.current].map((id) => [id, s.highlights[id] ?? []])),
    });
  }, [attemptId]);

  const flush = useCallback(
    async (opts: { keepalive?: boolean } = {}): Promise<void> => {
      if (closed.current) return;
      if (inFlight.current) {
        await inFlight.current;
        if (dirtyR.current.size || dirtyH.current.size || dirtyPos.current) return flush(opts);
        return;
      }
      const rIds = [...dirtyR.current];
      const hIds = [...dirtyH.current];
      const pos = dirtyPos.current;
      if (!rIds.length && !hIds.length && !pos) return;
      dirtyR.current.clear();
      dirtyH.current.clear();
      dirtyPos.current = false;

      const s = stateRef.current;
      const body = JSON.stringify({
        responses: rIds.map((id) => ({ questionId: id, ...(s.responses[id] ?? EMPTY), timeSpentMs: Math.round(timeRef.current[id] ?? 0) })),
        highlights: hIds.map((id) => ({ passageId: id, ranges: s.highlights[id] ?? [] })),
        ...(pos ? { lastPosition: s.index } : {}),
      });
      const requeue = () => {
        rIds.forEach((id) => dirtyR.current.add(id));
        hIds.forEach((id) => dirtyH.current.add(id));
        if (pos) dirtyPos.current = true;
      };

      setStatus("saving");
      inFlight.current = (async () => {
        try {
          const res = await fetch(`/api/attempts/${attemptId}/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: opts.keepalive,
          });
          if (res.ok) {
            const json = (await res.json()) as SyncResult;
            if (!json.ok) return goToResults();
            retryDelay.current = 1000;
            setStatus(dirtyR.current.size || dirtyH.current.size ? "saving" : "saved");
            snapshotBackup();
          } else if (res.status === 400 || res.status === 404) {
            setStatus("error"); // not retryable: the server refused this data
          } else {
            requeue();
            setStatus("offline");
            schedule(retryDelay.current);
            retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
          }
        } catch {
          requeue();
          snapshotBackup();
          setStatus("offline");
          schedule(retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
        } finally {
          inFlight.current = null;
        }
      })();
      await inFlight.current;
    },
    [attemptId, goToResults, snapshotBackup],
  );

  const flushRef = useRef(flush);
  flushRef.current = flush;
  function schedule(ms = 600) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), ms);
  }

  const markResponse = (id: string) => {
    dirtyR.current.add(id);
    setStatus("saving");
    snapshotBackup();
    schedule();
  };

  // Restore anything that never reached the server (crash, offline, closed tab).
  useEffect(() => {
    const b = readBackup(attemptId);
    if (!b) return;
    if (Object.keys(b.responses).length) {
      // localStorage only exists after hydration, so restoring unsynced answers has to happen here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResponses((r) => ({ ...r, ...b.responses }));
      for (const [id, v] of Object.entries(b.responses)) {
        timeRef.current[id] = Math.max(timeRef.current[id] ?? 0, v.timeSpentMs);
        dirtyR.current.add(id);
      }
    }
    if (Object.keys(b.highlights).length) {
      setHighlights((h) => ({ ...h, ...b.highlights }));
      Object.keys(b.highlights).forEach((id) => dirtyH.current.add(id));
    }
    schedule(200);
  }, [attemptId]);

  // Save when the tab is hidden or closed; keepalive lets the request outlive the page.
  useEffect(() => {
    const onHide = () => void flushRef.current({ keepalive: true });
    const onVisibility = () => document.visibilityState === "hidden" && onHide();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Time on the visible question, accumulated in a ref and saved every ~15s.
  useEffect(() => {
    if (view !== "question" || !q) return;
    const dirty = dirtyR.current;
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
        dirtyR.current.add(q.id);
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
    setResponses((r) => ({ ...r, [q.id]: { ...(r[q.id] ?? EMPTY), ...patch } }));
    markResponse(q.id);
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
    setHighlights((h) => {
      const current = h[passage.id] ?? [];
      const nextRanges = mode === "add" ? normalizeRanges([...current, ...picked], lengths) : picked.reduce(subtractRange, current);
      return { ...h, [passage.id]: nextRanges };
    });
    window.getSelection()?.removeAllRanges();
    setHasSelection(false);
    dirtyH.current.add(passage.id);
    snapshotBackup();
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

  const submit = useCallback(async () => {
    if (closed.current) return;
    setSubmitting(true);
    if (q) dirtyR.current.add(q.id);
    await flushRef.current();
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
      if (res.ok || res.status === 404) return goToResults();
      throw new Error(String(res.status));
    } catch {
      setSubmitting(false);
      setStatus("offline");
    }
  }, [attemptId, goToResults, q]);

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
          <p className="truncate font-medium">{initial.exam.title}</p>
          <p className="text-xs text-white/70">
            {view === "review" ? "Review" : `Question ${index + 1} of ${questions.length}`} · {initial.mode === "TIMED" ? "Timed" : "Untimed"}
          </p>
        </div>
        <ExamClock deadlineAt={initial.deadlineAt} startedAt={initial.startedAt} serverOffsetMs={serverOffsetMs} onExpire={submit} />
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
              <CloudOff className="size-3.5" /> Offline, retrying. Your answers are kept on this device.
            </>
          )}
          {status === "error" && <span className="text-danger">Couldn’t save. Reload the page.</span>}
        </span>
      </div>

      {/* body */}
      <main className="min-h-0 flex-1">
        {view === "review" ? (
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
                className={cn("h-full overflow-y-auto border-r px-6 py-6 md:block md:px-10", mobilePane === "passage" ? "block" : "hidden")}
              >
                <PassagePane ref={passageRef} passage={passage} highlights={highlights[passage.id] ?? []} />
              </section>
            )}
            <section
              aria-label={`Question ${q.number}`}
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
            <AlertDialogAction onClick={() => void submit()}>Submit</AlertDialogAction>
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
