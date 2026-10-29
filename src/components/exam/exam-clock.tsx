"use client";

import { Eye, EyeOff, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatClock } from "@/lib/exam/timing";

/**
 * Display only: the server owns the deadline. `serverOffsetMs` corrects for a
 * wrong device clock (server time minus device time when the exam loaded).
 */
export function ExamClock({
  deadlineAt,
  startedAt,
  serverOffsetMs,
  onExpire,
}: {
  deadlineAt: string | null;
  startedAt: string;
  serverOffsetMs: number;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(() => Date.now() + serverOffsetMs);
  const [hidden, setHidden] = useState(false);
  const warned = useRef<Set<number>>(new Set());
  const expired = useRef(false);
  const deadline = deadlineAt ? Date.parse(deadlineAt) : null;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + serverOffsetMs), 500);
    return () => clearInterval(t);
  }, [serverOffsetMs]);

  useEffect(() => {
    if (deadline === null) return;
    const left = deadline - now;
    for (const mins of [5, 1]) {
      if (left <= mins * 60_000 && left > 0 && !warned.current.has(mins)) {
        warned.current.add(mins);
        toast.warning(`${mins} minute${mins === 1 ? "" : "s"} left`);
      }
    }
    if (left <= 0 && !expired.current) {
      expired.current = true;
      onExpire();
    }
  }, [now, deadline, onExpire]);

  const ms = deadline === null ? now - Date.parse(startedAt) : deadline - now;
  const label = deadline === null ? "Elapsed" : "Time remaining";
  const urgent = deadline !== null && ms <= 5 * 60_000;
  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center gap-1.5 tabular-nums ${urgent ? "rounded bg-mark px-1.5 font-semibold text-navy" : ""}`} data-testid="exam-clock">
        <Timer className="size-4" aria-hidden />
        <span className="sr-only">{label}: </span>
        {hidden ? "––:––" : formatClock(ms)}
      </span>
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
        aria-label={hidden ? "Show timer" : "Hide timer"}
      >
        {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </button>
    </div>
  );
}
