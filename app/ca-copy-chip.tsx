"use client";

import { useState } from "react";

export function CopyCaChip({ ca, className = "" }: { ca: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCa() {
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className={`ca-chip ${className}`.trim()} onClick={copyCa} aria-label="Copy HyperHood contract address">
      <span>{copied ? "Copied" : "CA"}</span>
      <b>{ca}</b>
    </button>
  );
}
