'use client';
import { useEffect, useState } from 'react';
import { holdMultiplierForStreak } from '../worker/src/hold-multiplier';
const stages = [
  { title: 'Collect creator fees', text: 'The configured operator claims available creator fees. Only successfully received funds can enter the reward pool.' },
  { title: 'Snapshot holders', text: 'Each five-minute epoch snapshots eligible balances and adds the published bonus for consecutive eligible snapshots.' },
  { title: 'Distribute the pool', text: 'The worker allocates the collected pool by weighted balance, then records completed transfers for verification.' }
];
export function StrategyLab() {
  const [epoch, setEpoch] = useState(26);
  const [stage, setStage] = useState(1);
  const [ownBalance,setOwnBalance]=useState('');
  const [otherWeight,setOtherWeight]=useState('');
  const multiplier = holdMultiplierForStreak(epoch, 100, 20_000) / 10_000;
  const own=Number(ownBalance),other=Number(otherWeight),weighted=own*multiplier;
  const share=ownBalance.trim()!==''&&otherWeight.trim()!==''&&Number.isFinite(weighted)&&Number.isFinite(other)&&own>=0&&other>=0&&weighted+other>0?weighted/(weighted+other)*100:null;
  return <div className="strategy-lab"><div className="lab-top"><span>HOLD WEIGHT MODEL</span><span className="pill">INTERACTIVE MODEL</span></div><div className="weight-scene"><div className="weight-core"><span>REWARD WEIGHT</span><strong>{multiplier.toFixed(2)}<small>x</small></strong><span>{epoch} CONSECUTIVE SNAPSHOTS</span></div></div><div className="lab-controls"><div><label htmlFor="epochs">Consecutive eligible snapshots</label><output htmlFor="epochs">{epoch}</output></div><input id="epochs" type="range" min="1" max="101" value={epoch} onChange={e=>setEpoch(Number(e.target.value))}/><div className="range-labels"><span>1 snapshot / 1.00x</span><span>101 snapshots / 2.00x</span></div></div><details className="share-calculator"><summary>Calculate a hypothetical pool share</summary><div className="calculator-body"><div className="calculator-head"><span>MODEL YOUR POOL SHARE</span><strong>{share===null?'Enter balances':share.toFixed(2)+'%'}</strong></div><div className="calculator-fields"><label>Your NSTR balance<input type="number" min="0" step="1" inputMode="decimal" placeholder="Enter balance" value={ownBalance} onChange={e=>setOwnBalance(e.target.value)}/></label><label>Other holders’ total weight<input type="number" min="0" step="1" inputMode="decimal" placeholder="Weighted NSTR balance" value={otherWeight} onChange={e=>setOtherWeight(e.target.value)}/></label></div><p>Your balance × multiplier ÷ total weighted pool. These are your inputs, not live holder data.</p></div></details><div className="flow-tabs" role="tablist" aria-label="Reward cycle">{stages.map((s,i)=><button key={s.title} id={'stage-'+i} role="tab" aria-selected={stage===i} aria-controls="stage-panel" onClick={()=>setStage(i)}><span>0{i+1}</span>{['Collect','Snapshot','Distribute'][i]}</button>)}</div><div id="stage-panel" role="tabpanel" aria-labelledby={'stage-'+stage} className="stage-panel"><strong>{stages[stage].title}</strong><p>{stages[stage].text}</p></div><p className="lab-note">Rule illustration only. A higher weight changes your share of a funded pool; it does not guarantee a payout.</p></div>
}
export function NearMarket() {
 const [data,setData]=useState<{price:number;updatedAt:string|null;nearAssets:number;chains:number}|null>(null);
 const [error,setError]=useState(false);
 useEffect(()=>{const controller=new AbortController(); const load=()=>fetch('/api/near-market',{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(v=>{setData(v);setError(false)}).catch(()=>{if(!controller.signal.aborted){setError(true);setData(null)}}); load();const interval=setInterval(load,60000);return()=>{controller.abort();clearInterval(interval)}},[]);
 return <div className="market-bar"><div><span>NEAR / USD</span><strong>{data?'$'+data.price.toFixed(2):error?'Unavailable':'Connecting'}</strong><small>1Click provider price</small></div><div><span>NEAR NETWORK ASSETS</span><strong>{data?.nearAssets??(error?'Unavailable':'Loading')}</strong><small>Supported directory assets</small></div><div><span>INTENTS NETWORKS</span><strong>{data?.chains??(error?'Unavailable':'Loading')}</strong><small>Networks in the asset directory</small></div><div><span>NSTR REWARD EPOCH</span><strong>5 minutes</strong><small>Planned cadence / not active</small></div></div>
}
