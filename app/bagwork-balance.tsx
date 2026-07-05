"use client";

import { useEffect, useState } from "react";

type StatsResponse = {
  bagholderSolBalance: number | null;
};

function formatSol(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN) || (value ?? 0) <= 0) return "0 SOL";
  return `${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

export function BagworkBalance() {
  const [balance, setBalance] = useState<number | null>(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/stats", { cache: "no-store" });
        if (!response.ok) return;
        const stats = (await response.json()) as StatsResponse;
        if (active) setBalance(stats.bagholderSolBalance ?? 0);
      } catch {
        if (active) setBalance(0);
      }
    };

    load();
    const timer = window.setInterval(load, 12_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="bagwork-balance">
      <span>Bagwork Wallet</span>
      <strong>{formatSol(balance)}</strong>
    </div>
  );
}
