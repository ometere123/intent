"use client";
import { useState } from 'react';
import type { FormEvent } from 'react';
import { createIntent } from '@/lib/intent-contract';

export default function NewIntent(){
  const[id,setId]=useState('cloud-pro-2026');
  const[statement,setStatement]=useState('Purchase one annual Pro subscription from ExampleCloud for no more than 200 USDC. Do not create a recurring token approval, grant an unlimited approval, or authorise any unrelated transfer.');
  const[scope,setScope]=useState('{\n  "purpose": "annual cloud subscription",\n  "currency": "USDC",\n  "max_amount": "200"\n}');
  const[expiry,setExpiry]=useState('');
  const[status,setStatus]=useState('');
  const[busy,setBusy]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!window.ethereum){setStatus('No EIP-1193 wallet detected.');return;}
    setBusy(true); setStatus('');
    try{
      const parsed=JSON.parse(scope) as Record<string,unknown>;
      const expiresAtUnix=expiry?Math.floor(new Date(expiry).getTime()/1000):0;
      const hash=await createIntent(window.ethereum,{id,statement,scope:parsed,expiresAtUnix});
      setStatus(`Created revision 1 on Studionet 61999. GenLayer tx: ${hash}`);
    }catch(error){setStatus(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
  }

  return <><div className="topbar"><div><div className="eyebrow">new mandate</div><h1 className="h1">Write authority the way a human actually thinks.</h1><p className="lead">The natural-language statement is authoritative. Structured scope gives validators stable context; hard rules in the SDK can reject obvious violations before consensus.</p></div></div><div className="split"><form className="card form" onSubmit={submit}><div className="field"><label>Intent ID</label><input value={id} onChange={e=>setId(e.target.value)}/></div><div className="field"><label>Human mandate</label><textarea value={statement} onChange={e=>setStatement(e.target.value)}/></div><div className="field"><label>Scope metadata (JSON)</label><textarea className="mono" value={scope} onChange={e=>setScope(e.target.value)}/></div><div className="field"><label>Expiry</label><input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)}/></div><button className="btn" type="submit" disabled={busy}>{busy?'Submitting…':'Create immutable revision 1'}</button>{status&&<div className="callout" style={{overflowWrap:'anywhere'}}>{status}</div>}</form><div className="grid"><div className="card"><div className="kicker">Hard rules belong in the integration</div><h2>Reject without asking validators</h2><p className="muted">The reusable wallet guard supports maximum native value, target allow/deny lists, forbidden selectors and unlimited ERC-20 approval blocking. Those rules are supplied by the integrating dapp alongside the on-chain mandate.</p></div><div className="card"><div className="kicker">Version semantics</div><p className="muted">Edits do not rewrite revision 1. A later change creates revision 2, so every decision remains explainable against the mandate it actually used.</p></div></div></div></>;
}
