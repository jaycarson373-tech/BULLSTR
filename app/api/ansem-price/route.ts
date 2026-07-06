import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DexPair = {
  url?: string;
  priceUsd?: string;
  priceChange?: {
    h24?: number;
  };
  liquidity?: {
    usd?: number;
  };
};

type DexResponse = {
  pairs?: DexPair[];
};

const DEFAULT_ANSEM_MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump";

function emptyPrice() {
  return {
    priceUsd: 0,
    priceChange24h: 0,
    url: null,
    updatedAt: new Date().toISOString()
  };
}

export async function GET() {
  const mint = process.env.REWARD_TOKEN_MINT ?? process.env.NEXT_PUBLIC_REWARD_TOKEN_MINT ?? DEFAULT_ANSEM_MINT;

  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) return NextResponse.json(emptyPrice());

    const data = (await response.json()) as DexResponse;
    const pair = (data.pairs ?? [])
      .filter((item) => Number(item.priceUsd ?? 0) > 0)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

    if (!pair) return NextResponse.json(emptyPrice());

    return NextResponse.json({
      priceUsd: Number(pair.priceUsd ?? 0) || 0,
      priceChange24h: Number(pair.priceChange?.h24 ?? 0) || 0,
      url: pair.url ?? null,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn("ANSEM price route failed", error);
    return NextResponse.json(emptyPrice());
  }
}
