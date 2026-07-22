"use client";

import { useEffect, useState } from "react";

function remainingSeconds(minutes: number) {
  const epochSeconds = Math.max(1, minutes) * 60;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const elapsed = nowSeconds % epochSeconds;
  return elapsed === 0 ? 0 : epochSeconds - elapsed;
}

function format(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function EpochCountdown({ minutes = 5 }: { minutes?: number }) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setSeconds(remainingSeconds(minutes));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [minutes]);

  return <span>{seconds === null ? "--:--" : format(seconds)}</span>;
}
