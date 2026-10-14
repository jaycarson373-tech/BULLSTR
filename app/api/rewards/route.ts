import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  const wallet=new URL(request.url).searchParams.get("wallet");
  if(wallet&&!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet))return NextResponse.json({error:"Enter a valid Solana wallet address."},{status:400});
  try {
    const url=new URL("https://bullstr-production.up.railway.app/rewards");if(wallet)url.searchParams.set("wallet",wallet);
    const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(10000)});
    const data=await response.json();
    if(!response.ok || !Array.isArray(data.payouts))throw new Error();
    return NextResponse.json(data,{headers:{"Cache-Control":"no-store"}});
  } catch {return NextResponse.json({error:"Reward receipts are temporarily unavailable. Please retry."},{status:503});}
}
