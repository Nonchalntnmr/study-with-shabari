"use client";

import { Eye, EyeOff, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatClock } from "@/lib/exam/timing";

/**
 * Display only: the server owns the deadline. `serverTime` is the server's clock
 * as the runner tracks it (last sync plus monotonic time), so a wrong or
 * changing device clock can neither shorten nor stretch the attempt. Reaching
 * zero asks the server to end it; the server checks its own deadline.
 */
export function ExamClock({
  deadlineAt,
  startedAt,
  serverTime,
  onExpire,
}: {
  deadlineAt: string | null;
  startedAt: string;
  serverTime: () => number;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(() => Date.parse(startedAt));
  const [hidden, setHidden] = useState(false);
  const warned = useRef<Set<number>>(new Set());
  const expired = useRef(false);
  const deadline = deadlineAt ? Date.parse(deadlineAt) : null;

  useEffect(() => {
    const tick = () => setNow(serverTime());
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [serverTime]);

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
