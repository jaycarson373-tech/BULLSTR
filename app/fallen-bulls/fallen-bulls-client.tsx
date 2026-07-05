"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FallenBull = {
  address: string;
  balance: number;
  currentStreak: number | null;
  totalRewardEarned: number;
  lastAirdropAt: string | null;
  ineligibleReason: string;
  ineligibleAt: string | null;
  lastSeenAt: string | null;
};

type HoldersResponse = {
  fallenBulls?: FallenBull[];
};

const emptyResponse: HoldersResponse = { fallenBulls: [] };

function compactAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

function formatDate(value: string | null) {
  if (!value) return "Awaiting";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Awaiting" : date.toLocaleString();
}

async function getHolders() {
  try {
    const response = await fetch("/api/holders", { cache: "no-store" });
    if (!response.ok) return emptyResponse;
    return (await response.json()) as HoldersResponse;
  } catch {
    return emptyResponse;
  }
}

export function FallenBullsClient() {
  const [fallenBulls, setFallenBulls] = useState<FallenBull[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const data = await getHolders();
      if (active) setFallenBulls(data.fallenBulls ?? []);
    };

    load();
    const timer = window.setInterval(load, 12000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="page">
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" href="/">
            <img className="brand-logo" src="/brand/bull-strategy-logo.png" alt="Bull Strategy logo" />
            <span>
              Bull Strategy
              <small>BlackBull List</small>
            </span>
          </Link>
          <div className="nav-links">
            <Link href="/">Landing</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/fallen-bulls">BlackBull List</Link>
          </div>
        </div>
      </header>

      <main className="dashboard fallen-bulls-page">
        <section className="section history-section">
          <div className="container">
            <div className="section-kicker">Fallen Bulls</div>
            <div className="section-head split-head">
              <h1 className="dashboard-title">BlackBull List</h1>
              <p>Wallets that qualified with 250,000+ $BULLSTR, then sold and lost future $ANSEM and $BULLSTR rewards.</p>
            </div>

            <div className="history-card bull-board-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Wallet</th>
                      <th>Reason</th>
                      <th>Total Rewards Earned</th>
                      <th>List Status</th>
                      <th>Final Streak</th>
                      <th>Last Airdrop</th>
                      <th>Listed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fallenBulls.length ? (
                      fallenBulls.map((wallet) => (
                        <tr key={`${wallet.address}-${wallet.ineligibleAt ?? wallet.lastSeenAt ?? "fallen"}`}>
                          <td>{compactAddress(wallet.address)}</td>
                          <td>{wallet.ineligibleReason}</td>
                          <td>{formatNumber(wallet.totalRewardEarned)} Rewards</td>
                          <td>BlackBull Listed</td>
                          <td>{wallet.currentStreak ?? 0} epochs</td>
                          <td>{formatDate(wallet.lastAirdropAt)}</td>
                          <td>{formatDate(wallet.ineligibleAt ?? wallet.lastSeenAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7}>No wallets on the BlackBull List yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
