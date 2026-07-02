"use client";

import { useEffect, useState } from "react";

type StatsResponse = {
  totalEpochs: number;
  totalRewardAirdropped: number;
  latestEligibleHolders: number;
};

const fallbackStats: StatsResponse = {
  totalEpochs: 0,
  totalRewardAirdropped: 0,
  latestEligibleHolders: 0
};
const SOURCE_SYMBOL = process.env.NEXT_PUBLIC_SOURCE_SYMBOL ?? "BULLSTR";
const REWARD_SYMBOL = process.env.NEXT_PUBLIC_REWARD_SYMBOL ?? "ANSEM";

async function getStats() {
  try {
    const response = await fetch("/api/stats", { cache: "no-store" });
    if (!response.ok) return fallbackStats;
    return (await response.json()) as StatsResponse;
  } catch {
    return fallbackStats;
  }
}

function displayNumber(value: number, empty = "–") {
  if (!value) return empty;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function displayCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return "–";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function SiteLiveStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const nextStats = await getStats();
      if (active) setStats(nextStats);
    };

    load();
    const timer = window.setInterval(load, 12_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="container stats">
      <div className="stat">
        <strong>{stats ? displayNumber(stats.totalEpochs) : "–"}</strong>
        <span>Total epochs</span>
      </div>
      <div className="stat">
        <strong>{stats ? displayNumber(stats.totalRewardAirdropped, "Awaiting first drop") : "–"}</strong>
        <span>Total {REWARD_SYMBOL} Airdropped</span>
      </div>
      <div className="stat">
        <strong>{stats ? displayCount(stats.latestEligibleHolders) : "–"}</strong>
        <span>Eligible {SOURCE_SYMBOL} Holders</span>
      </div>
    </div>
  );
}
