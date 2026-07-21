"use client";

import { useState } from "react";

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 5)}...${wallet.slice(-5)}`;
}

export function CopyContract({ mint }: { mint: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(mint);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="contract-link" onClick={copy} title="Copy contract address" type="button">
      <span>CA</span>{copied ? "Copied" : shortWallet(mint)}
    </button>
  );
}
