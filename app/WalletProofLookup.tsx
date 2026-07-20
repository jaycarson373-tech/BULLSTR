"use client";

import { FormEvent, useState } from "react";

type ProofResult = {
  wallet: string;
  distributionCount: number;
  roundCount: number;
  totals: { asset: string; amount: string }[];
  proofs: {
    signature: string;
    epochId: string;
    rewardAsset: string;
    rewardAmount: string;
    settledAt: string | null;
  }[];
  holder: null | {
    sourceBalance: string;
    eligibleSince: string | null;
    lastSeenAt: string | null;
    streakEpochs: number;
    multiplierBps: number;
    multiplier: string;
    diamondTier: number;
    permanentlyIneligible: boolean;
    ineligibilityReason: string | null;
  };
};

function formatDecimal(value: string) {
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction.slice(0, 6)}` : grouped;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : "Not recorded";
}

function shortSignature(value: string) {
  return `${value.slice(0, 7)}...${value.slice(-7)}`;
}

export function WalletProofLookup() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<ProofResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/api/proofs?wallet=${encodeURIComponent(wallet.trim())}`, { cache: "no-store" });
      const payload = (await response.json()) as ProofResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Proof lookup failed.");
      setResult(payload);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Proof lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wallet-lookup">
      <form onSubmit={submit}>
        <label htmlFor="proof-wallet">Solana wallet address</label>
        <div className="wallet-input-row">
          <input
            id="proof-wallet"
            inputMode="text"
            onChange={(event) => setWallet(event.target.value)}
            placeholder="Paste wallet address"
            spellCheck={false}
            value={wallet}
          />
          <button disabled={loading || !wallet.trim()} type="submit">
            {loading ? "Checking..." : "View Airdrops"}
          </button>
        </div>
        <p>No wallet connection or signature required. This only reads published distribution records.</p>
      </form>

      <div aria-live="polite">
        {error ? <p className="lookup-error">{error}</p> : null}
        {result ? (
          <div className="lookup-results">
            <div className="lookup-summary">
              <article>
                <span>Total airdrops</span>
                <strong>{result.distributionCount}</strong>
                <em>{result.roundCount} settled rounds</em>
              </article>
              <article>
                <span>Diamond Hand Score</span>
                <strong>{result.holder ? "💎".repeat(result.holder.diamondTier) : "Not indexed"}</strong>
                <em>{result.holder ? `${result.holder.multiplier} allocation weight` : "No holder snapshot found"}</em>
              </article>
              <article>
                <span>Current $DI6900</span>
                <strong>{formatDecimal(result.holder?.sourceBalance ?? "0")}</strong>
                <em>
                  {result.holder?.permanentlyIneligible
                    ? `Ineligible: ${result.holder.ineligibilityReason || "holder rule"}`
                    : `Last indexed ${formatDate(result.holder?.lastSeenAt ?? null)}`}
                </em>
              </article>
            </div>

            <div className="asset-totals">
              {result.totals.length ? (
                result.totals.map((total) => (
                  <article key={total.asset}>
                    <span>{total.asset} received</span>
                    <strong>{formatDecimal(total.amount)}</strong>
                  </article>
                ))
              ) : (
                <article className="lookup-empty">
                  <span>Published rewards</span>
                  <strong>0</strong>
                  <em>No settled airdrops found for this wallet.</em>
                </article>
              )}
            </div>

            {result.proofs.length ? (
              <div className="wallet-proofs">
                <span>Latest transaction proofs</span>
                {result.proofs.map((proof) => (
                  <a
                    href={`https://solscan.io/tx/${proof.signature}`}
                    key={proof.signature}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <strong>{formatDecimal(proof.rewardAmount)} {proof.rewardAsset}</strong>
                    <em>{shortSignature(proof.signature)}</em>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
