"use client";

import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";

export function usePhaseTimer(
  endsAt: Timestamp | null,
  onExpire?: () => void
) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      const secs = Math.max(0, Math.ceil((endsAt.toMillis() - Date.now()) / 1000));
      setRemaining(secs);
      if (secs === 0 && onExpire) onExpire();
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  return remaining;
}
