import type { CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";
import { BullCursor } from "./bull-cursor";

export const dynamic = "force-dynamic";

const X_URL = process.env.NEXT_PUBLIC_BULL_X_URL?.trim();
const CA = process.env.NEXT_PUBLIC_BULL_CA?.trim();

type EpochDrop = {
  epochId: string;
  amount: number;
  recipients: number;
  status: string;
};

const floatingBulls = [
  ["4%", "9%", "1.6rem", "18s"],
  ["11%", "76%", "2.2rem", "22s"],
  ["18%", "27%", "1.1rem", "16s"],
  ["27%", "88%", "1.8rem", "21s"],
  ["34%", "14%", "2.4rem", "19s"],
  ["42%", "68%", "1.2rem", "17s"],
  ["51%", "35%", "2rem", "24s"],
  ["59%", "8%", "1.4rem", "20s"],
  ["66%", "80%", "2.6rem", "23s"],
  ["74%", "18%", "1.2rem", "16s"],
  ["82%", "58%", "2.1rem", "25s"],
  ["91%", "32%", "1.5rem", "18s"]
];

function fmtAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function shortEpoch(epochId: string) {
  const date = Date.parse(epochId);
  if (!Number.isFinite(date)) return epochId.slice(0, 16);
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(date));
}

async function getEpochDrops(): Promise<EpochDrop[]> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !serviceRole) return [];

  try {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false }
    });

    const { data: epochs } = await supabase
      .from("epochs")
      .select("epoch_id,status,completed_at,started_at")
      .order("started_at", { ascending: false })
      .limit(5);

    const epochIds = (epochs ?? []).map((epoch) => String(epoch.epoch_id));
    const { data: payouts } = await supabase
      .from("payouts")
      .select("epoch_id,reward_amount,status,reward_asset")
      .eq("status", "settled")
      .eq("reward_asset", "ANSEM")
      .in("epoch_id", epochIds.length ? epochIds : ["__none__"]);

    const totals = new Map<string, { amount: number; recipients: number }>();
    for (const payout of payouts ?? []) {
      const epochId = String(payout.epoch_id);
      const current = totals.get(epochId) ?? { amount: 0, recipients: 0 };
      current.amount += Number(payout.reward_amount ?? 0);
      current.recipients += 1;
      totals.set(epochId, current);
    }

    return (epochs ?? []).map((epoch) => {
      const epochId = String(epoch.epoch_id);
      const total = totals.get(epochId);
      return {
        epochId,
        amount: total?.amount ?? 0,
        recipients: total?.recipients ?? 0,
        status: String(epoch.status ?? "waiting")
      };
    });
  } catch {
    return [];
  }
}

export default async function Page() {
  const drops = await getEpochDrops();

  return (
    <main className="bull-page">
      <BullCursor />
      <div className="emoji-field" aria-hidden="true">
        {floatingBulls.map(([left, top, size, duration], index) => (
          <span
            key={`${left}-${top}`}
            style={
              {
                "--x": left,
                "--y": top,
                "--size": size,
                "--dur": duration,
                "--delay": `${index * -1.7}s`
              } as CSSProperties
            }
          >
            🐂
          </span>
        ))}
      </div>

      <section className="bull-hero" aria-label="BULL token overview">
        <p className="emoji-day">since it&apos;s emoji day</p>
        <div className="mega-bull" aria-hidden="true">🐂</div>
        <h1>BULL</h1>
        <p className="bull-copy">
          Hold <strong>1M+ BULL</strong> to be eligible. Every 5 minutes, fees
          swap into <strong>$ANSEM</strong> and airdrop eligible holders.
        </p>
        <div className="bull-links" aria-label="BULL links">
          <a className={X_URL ? "link-pill" : "link-pill disabled"} href={X_URL || "#"} aria-disabled={!X_URL}>
            X account
          </a>
          <span className="ca-pill">CA: {CA || "coming soon"}</span>
        </div>
      </section>

      <section className="epoch-board" aria-label="ANSEM airdrop epoch dashboard">
        <div className="board-header">
          <span>5 minute epochs</span>
          <strong>$ANSEM airdropped</strong>
        </div>
        <div className="epoch-list">
          {drops.length ? (
            drops.map((drop) => (
              <article className="epoch-row" key={drop.epochId}>
                <span>{shortEpoch(drop.epochId)}</span>
                <strong>{fmtAmount(drop.amount)} ANSEM</strong>
                <em>{drop.recipients} wallets · {drop.status}</em>
              </article>
            ))
          ) : (
            <article className="epoch-row empty">
              <span>epoch 0</span>
              <strong>0 ANSEM</strong>
              <em>waiting for first settled airdrop</em>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}
