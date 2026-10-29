"use client";

import { useEffect } from "react";

/** Once results exist the server has everything; drop this attempt's on-device copy (e.g. after a refresh mid-submit). */
export function ClearAttemptBackup({ attemptId }: { attemptId: string }) {
  useEffect(() => {
    try {
      localStorage.removeItem(`sws:attempt:${attemptId}`);
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }, [attemptId]);
  return null;
}
