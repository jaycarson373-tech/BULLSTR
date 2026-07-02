"use client";

import { useState } from "react";

type CopyCaButtonProps = {
  address: string;
  label: string;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyCaButton({ address, label }: CopyCaButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button className="mini-button mono ca-copy-button" type="button" onClick={handleCopy} aria-label="Copy contract address">
      {copied ? "Copied" : `CA ${label}`}
    </button>
  );
}
