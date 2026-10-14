import { NextResponse } from 'next/server';
export async function GET() {
  try {
    const response = await fetch('https://1click.chaindefuser.com/v0/tokens', { next: { revalidate: 60 }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Market data unavailable');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid directory');
    const near = data.find((a: { assetId?: string }) => a.assetId === 'nep141:wrap.near');
    if (!near || !Number.isFinite(near.price) || near.price <= 0) throw new Error('NEAR price unavailable');
    return NextResponse.json({ price: near.price, updatedAt: near.priceUpdatedAt || null, nearAssets: data.filter((a: { blockchain?: string }) => a.blockchain === 'near').length, chains: new Set(data.map((a: { blockchain?: string }) => a.blockchain).filter(Boolean)).size, source: '1Click asset directory' });
  } catch { return NextResponse.json({ error: 'Live NEAR market data is temporarily unavailable.' }, { status: 503 }); }
}
