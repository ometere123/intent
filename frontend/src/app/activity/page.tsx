"use client";
import { useState } from 'react';
import { getDecision, getExecutionReceipt, getOwnerCounts, listRecentActionIds } from '@/lib/intent-contract';

type Row={actionId:string;intentId:string;revision:number;outcome:string;target:string;receipt:string};

export default function Activity(){
  const[rows,setRows]=useState<Row[]>([]); const[status,setStatus]=useState('Load the connected wallet’s on-chain decision ledger.'); const[busy,setBusy]=useState(false);
  async function load(){
    if(!window.ethereum){setStatus('No EIP-1193 wallet detected.');return;}
    setBusy(true);
    try{
      const accounts=await window.ethereum.request({method:'eth_requestAccounts'}) as string[]; const owner=accounts?.[0]; if(!owner)throw new Error('No wallet account connected.');
      const rawCounts=await getOwnerCounts(owner) as Record<string,unknown>;
      const total=Number(rawCounts?.action_count??0);
      const ids=await listRecentActionIds(owner,total,250);
      const out:Row[]=[];
      for(const actionId of ids){
        const raw=await getDecision(owner,actionId); if(typeof raw!=='string'||!raw)continue;
        const d=JSON.parse(raw) as Record<string,unknown>; const rr=await getExecutionReceipt(owner,actionId); let receipt='';
        if(typeof rr==='string'&&rr){try{const r=JSON.parse(rr) as Record<string,unknown>;receipt=String(r.target_tx_hash??'');}catch{}}
        const action=(d.action&&typeof d.action==='object'?d.action:{}) as Record<string,unknown>;
        out.push({actionId,intentId:String(d.intent_id??''),revision:Number(d.intent_revision??0),outcome:String(d.outcome??''),target:`Chain ${String(action.targetChainId??'?')}`,receipt});
      }
      setRows(out.reverse()); setStatus(`Loaded ${out.length} recent decision${out.length===1?'':'s'} from Studionet 61999${total>250?` (latest 250 of ${total})`:''}.`);
    }catch(error){setStatus(error instanceof Error?error.message:String(error));} finally{setBusy(false);}
  }
  return <><div className="topbar"><div><div className="eyebrow">decision ledger</div><h1 className="h1">Every semantic release has a reason and a binding.</h1><p className="lead">A decision is tied to one owner, one immutable intent revision and one canonical action ID. Execution receipts are separate audit anchors.</p></div><button className="btn secondary" onClick={load} disabled={busy}>{busy?'Loading…':'Load ledger'}</button></div><div className="callout" style={{marginBottom:18}}>{status}</div><div className="card"><table className="table"><thead><tr><th>Action</th><th>Intent</th><th>Revision</th><th>Decision</th><th>Target</th><th>Receipt</th></tr></thead><tbody>{rows.map(r=><tr key={r.actionId}><td className="mono">{r.actionId.slice(0,10)}…{r.actionId.slice(-6)}</td><td>{r.intentId}</td><td>r{r.revision}</td><td><span className={`status ${r.outcome==='UNCLEAR'?'warn':r.outcome==='DOES_NOT_MATCH'?'bad':''}`}>{r.outcome}</span></td><td>{r.target}</td><td className="mono">{r.receipt?`${r.receipt.slice(0,10)}…`:'—'}</td></tr>)}{!rows.length&&<tr><td colSpan={6} className="muted">No decisions loaded.</td></tr>}</tbody></table></div></>;
}
