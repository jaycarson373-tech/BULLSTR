"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyContract({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="contract-control"
      type="button"
      onClick={copyAddress}
      aria-label="Copy Inuvestor contract address"
      title={address}
    >
      <strong>CA</strong>
      <span>{`${address.slice(0, 5)}...${address.slice(-5)}`}</span>
      {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
    </button>
  );
}
